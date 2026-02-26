import React from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency, formatLoanId } from '../../../utils/format';
import { LoanStatus } from '../../../config/enums';
import type { Loan } from '../../../types';

const { Text } = Typography;

interface RecentLoansTableProps {
    loans: Loan[];
    loading?: boolean;
}

const statusColors: Record<string, string> = {
    [LoanStatus.PENDING]: 'gold',
    [LoanStatus.APPROVED]: 'blue',
    [LoanStatus.ACTIVE]: 'green',
    [LoanStatus.COMPLETED]: 'cyan',
    [LoanStatus.DEFAULTED]: 'red',
    [LoanStatus.FAIL]: 'red',
};

const statusLabels: Record<string, string> = {
    [LoanStatus.PENDING]: 'Chờ duyệt',
    [LoanStatus.APPROVED]: 'Đã duyệt',
    [LoanStatus.ACTIVE]: 'Đang vay',
    [LoanStatus.COMPLETED]: 'Hoàn thành',
    [LoanStatus.DEFAULTED]: 'Nợ xấu',
    [LoanStatus.FAIL]: 'Thất bại',
};

const columns: ColumnsType<Loan> = [
    {
        title: 'Mã vay',
        dataIndex: '_id',
        key: '_id',
        render: (id: string) => <Text strong>{formatLoanId(id)}</Text>,
    },
    {
        title: 'Số tiền',
        dataIndex: 'capital',
        key: 'capital',
        align: 'right',
        render: (capital: number) => formatCurrency(capital),
    },
    {
        title: 'Kỳ hạn',
        dataIndex: 'term',
        key: 'term',
        align: 'center',
        render: (term: number) => `${term} tháng`,
    },
    {
        title: 'Lãi suất',
        dataIndex: 'interestRate',
        key: 'interestRate',
        align: 'right',
        render: (rate: number) => `${rate}%/năm`,
    },
    {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (status: LoanStatus) => (
            <Tag color={statusColors[status] || 'default'}>
                {statusLabels[status] || status}
            </Tag>
        ),
    },
];

const RecentLoansTable: React.FC<RecentLoansTableProps> = ({ loans, loading }) => {
    return (
        <Card title="Khoản vay gần đây" bordered={false}>
            <Table
                columns={columns}
                dataSource={loans}
                rowKey="_id"
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
            />
        </Card>
    );
};

export default RecentLoansTable;
