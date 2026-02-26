import React, { useRef, useState } from 'react';
import { Tag, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Resizable } from 'react-resizable';
import { getTransactions } from '../api';
import { formatCurrency } from '../../../utils/format';
import { TransactionType, PaymentStatus } from '../../../config/enums';
import type { Transaction } from '../../../types';

const { Text, Title } = Typography;

const statusColors: Record<string, string> = {
    [PaymentStatus.PENDING]: 'gold',
    [PaymentStatus.PROCESSING]: 'blue',
    [PaymentStatus.COMPLETED]: 'green',
    [PaymentStatus.FAILED]: 'red',
    [PaymentStatus.CANCELLED]: 'default',
};

const statusLabels: Record<string, string> = {
    [PaymentStatus.PENDING]: 'Chờ xử lý',
    [PaymentStatus.PROCESSING]: 'Đang xử lý',
    [PaymentStatus.COMPLETED]: 'Hoàn thành',
    [PaymentStatus.FAILED]: 'Thất bại',
    [PaymentStatus.CANCELLED]: 'Đã hủy',
};

// Resizable Title Component
const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

const RepaymentsPage: React.FC = () => {
    const actionRef = useRef<ActionType>(null);

    const defaultColumns: ProColumns<Transaction>[] = [
        {
            title: 'Từ khóa',
            dataIndex: 'keyword',
            hideInTable: true,
            search: {
                transform: (value) => ({ keyword: value }),
            },
        },
        {
            title: 'Mã GD',
            dataIndex: '_id',
            key: '_id',
            width: 100,
            fixed: 'left',
            copyable: true,
            search: false,
            render: (_: any, record) => <Text code>#{record._id.slice(-8).toUpperCase()}</Text>,
        },
        {
            title: 'Người vay',
            key: 'userId',
            width: 150,
            search: false,
            render: (_: any, record) => {
                const user = record.userId;
                if (!user) return '-';
                const id = (user as any)._id || user;
                const display = typeof user === 'object'
                    ? ((user as any).fullName || (user as any).phone || id.slice(-6))
                    : id.slice(-6);
                return <Link to={`/customers/${id}`}>{display}</Link>;
            },
        },
        {
            title: 'Khoản vay',
            key: 'loanId',
            width: 180,
            search: false,
            render: (_: any, record) => {
                const loan = record.loanId;
                if (!loan) return '-';
                const id = (loan as any)._id || loan;
                const purpose = typeof loan === 'object' ? ((loan as any).purpose || 'Khoản vay') : 'Khoản vay';
                return <Link to={`/loans/${id}`}>{purpose}</Link>;
            },
        },
        {
            title: 'Số tiền trả',
            dataIndex: 'amount',
            width: 140,
            sorter: (a, b) => a.amount - b.amount,
            render: (_: any, record) => (
                <Text style={{ color: '#f5222d', fontWeight: 'bold' }}>
                    -{formatCurrency(record.amount)}
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            valueType: 'select',
            valueEnum: statusLabels,
            render: (_: any, record) => (
                <Tag color={statusColors[record.status] || 'default'}>
                    {statusLabels[record.status] || record.status}
                </Tag>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            ellipsis: true,
            width: 250,
            search: false,
            render: (dom, entity) => <Text>{entity.description}</Text>,
        },
        {
            title: 'Thời gian trả',
            dataIndex: 'createdAt',
            width: 160,
            valueType: 'dateTime',
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            defaultSortOrder: 'descend',
            search: false,
        },
    ];

    const [columns, setColumns] = useState<ProColumns<Transaction>[]>(defaultColumns);

    const handleResize =
        (index: number) =>
            (_: React.SyntheticEvent, { size }: any) => {
                const newColumns = [...columns];
                newColumns[index] = {
                    ...newColumns[index],
                    width: Math.max(size.width, 100),
                };
                setColumns(newColumns);
            };

    const mergedColumns = columns.map((col, index) => ({
        ...col,
        onHeaderCell: (column: any) => ({
            width: column.width,
            onResize: handleResize(index),
        }),
    }));

    return (
        <div style={{ padding: 0 }}>
            <Title level={3} style={{ marginBottom: 24 }}>Quản lý trả nợ</Title>
            <ProTable<Transaction>
                columns={mergedColumns}
                actionRef={actionRef}
                cardBordered
                components={{
                    header: {
                        cell: ResizableTitle,
                    },
                }}
                request={async (params) => {
                    try {
                        const apiParams: any = {
                            page: params.current,
                            limit: params.pageSize,
                            type: TransactionType.REPAYMENT, // Only repayments
                            status: params.status,
                            keyword: params.keyword,
                        };

                        const data = await getTransactions(apiParams);
                        return {
                            data: data,
                            success: true,
                        };
                    } catch (error) {
                        message.error('Lỗi tải dữ liệu');
                        return {
                            data: [],
                            success: false,
                        };
                    }
                }}
                rowKey="_id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                    pageSize: 15,
                    showTotal: (total, range) => `${range[0]}-${range[1]} trên ${total} giao dịch`,
                }}
                dateFormatter="string"
                headerTitle="Lịch sử trả nợ"
                options={{
                    density: true,
                    fullScreen: true,
                    setting: true,
                    reload: true,
                }}
                scroll={{ x: 1200 }}
            />
        </div>
    );
};

export default RepaymentsPage;
