"""
Memory optimization utilities for large dataset processing.
Provides functions to reduce memory usage when working with large CSV files (>1GB).
"""

import pandas as pd
import numpy as np
import os
import sys
from src.exception import CustomException

def reduce_mem_usage(df, verbose=True):
    """
    Reduce memory usage of a DataFrame by downcasting numeric types.
    
    Args:
        df: pandas DataFrame
        verbose: whether to print memory reduction info
    
    Returns:
        DataFrame with optimized memory usage
    """
    try:
        start_mem = df.memory_usage(deep=True).sum() / 1024**2
        
        for col in df.columns:
            col_type = df[col].dtype
            
            if col_type != object and col_type.name != 'category':
                c_min = df[col].min()
                c_max = df[col].max()
                
                if str(col_type)[:3] == 'int':
                    if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                        df[col] = df[col].astype(np.int8)
                    elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                        df[col] = df[col].astype(np.int16)
                    elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                        df[col] = df[col].astype(np.int32)
                elif str(col_type)[:5] == 'float':
                    if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                        df[col] = df[col].astype(np.float32)
        
        end_mem = df.memory_usage(deep=True).sum() / 1024**2
        
        if verbose:
            reduction = 100 * (start_mem - end_mem) / start_mem
            print(f'Memory usage: {start_mem:.2f} MB -> {end_mem:.2f} MB ({reduction:.1f}% reduction)')
        
        return df
    except Exception as e:
        raise CustomException(e, sys)


def read_csv_in_chunks(filepath, chunksize=100_000, usecols=None, dtype=None, optimize_memory=True):
    """
    Read a large CSV file in chunks and concatenate with memory optimization.
    
    Args:
        filepath: path to CSV file
        chunksize: number of rows per chunk (default: 100,000)
        usecols: list of columns to read (optional)
        dtype: dict of column dtypes (optional)
        optimize_memory: whether to apply memory optimization (default: True)
    
    Returns:
        Optimized DataFrame
    """
    try:
        chunks = []
        total_rows = 0
        
        for i, chunk in enumerate(pd.read_csv(filepath, chunksize=chunksize, usecols=usecols, dtype=dtype, low_memory=False)):
            if optimize_memory:
                chunk = reduce_mem_usage(chunk, verbose=False)
            chunks.append(chunk)
            total_rows += len(chunk)
            
            if (i + 1) % 10 == 0:
                print(f'Processed {total_rows:,} rows...')
        
        df = pd.concat(chunks, ignore_index=True)
        print(f'Loaded {len(df):,} rows from {os.path.basename(filepath)}')
        
        if optimize_memory:
            mem_usage = df.memory_usage(deep=True).sum() / 1024**2
            print(f'Final memory usage: {mem_usage:.2f} MB')
        
        return df
    except Exception as e:
        raise CustomException(e, sys)


def get_data_path(filename):
    """
    Get standardized path to data files in input directory.
    Works regardless of whether called from notebook or src.
    
    Args:
        filename: name of the file (e.g., 'clean_loan_data.parquet')
    
    Returns:
        Absolute path to the file
    """
    # Try relative paths from common locations
    possible_paths = [
        os.path.join('..', 'input', filename),      # From notebooks/
        os.path.join('input', filename),             # From project root
        os.path.join('..', '..', 'input', filename), # From src/subdir
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    raise FileNotFoundError(f"Could not find {filename} in any expected location. Tried: {possible_paths}")


def save_optimized_parquet(df, filepath):
    """
    Save DataFrame to Parquet format with compression.
    Parquet is typically 5-10x smaller than CSV and faster to load.
    
    Args:
        df: DataFrame to save
        filepath: output path for parquet file
    """
    try:
        df.to_parquet(filepath, index=False, compression='snappy')
        file_size = os.path.getsize(filepath) / 1024**2
        print(f'Saved to {os.path.basename(filepath)} ({file_size:.2f} MB)')
    except Exception as e:
        raise CustomException(e, sys)
