import { useMemo } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { DataTable } from '../components/shared/data-table/DataTable';
import useTitle from '../hooks/useTitle';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import type { FormType, PaginatedResponseType } from '../types';
import { Checkbox } from '../components/ui/Checkbox';
import { DataTableColumnHeader } from '../components/shared/data-table/DataTableColumnHeader';
import { Switch } from '../components/ui/Switch';
import DataTableRowActions from '../components/my-forms/DataTableRowActions';
import Error from './Error';
import DataTableShimmer from '../components/shared/data-table/DataTableShimmer';

dayjs.extend(relativeTime);

interface FormsResponseType extends PaginatedResponseType {
  forms: FormType[];
}

export default function MyForms() {
  useTitle('Anketlerim | AnketKOU');
  const [searchParams] = useSearchParams();
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();

  const params = {
    page: searchParams.get('page') || 0,
    pageSize: searchParams.get('pageSize') || 10,
    sort: searchParams.get('sort') || '-createdAt',
    search: searchParams.get('query'),
  };
  const { data, isPending, isError, isFetching } = useQuery<FormsResponseType>({
    queryKey: ['forms', params],
    queryFn: () =>
      axiosPrivate({
        url: '/forms',
        params,
      }).then(res => res.data.data),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: ({ formId, isActive }: { formId: string; isActive: boolean }) =>
      axiosPrivate.patch('/forms/' + formId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['forms'],
      });
      toast.success('Anket başarıyla güncellendi');
    },
    onError: () => toast.error('Anket güncellenirken hata oluştu'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (forms: string[]) =>
      axiosPrivate.patch('/forms/bulk-delete', {
        forms,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['forms'],
      });
      toast.success('Anketler başarıyla silindi');
    },
    onError: () => toast.error('Anketler silinirken hata oluştu'),
  });

  const columns: ColumnDef<FormType>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Hepsini seç"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Satır seç"
            onClick={e => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Durum" />
        ),
        cell: ({ row }) => (
          <Switch
            checked={row.original.isActive}
            disabled={
              mutation.isPending &&
              mutation.variables?.formId === row.original._id
            }
            onCheckedChange={checked => {
              mutation.mutate({ formId: row.original._id, isActive: checked });
            }}
            onClick={e => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Anket Adı" />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Oluşturulma Tarihi" />
        ),
        cell: ({ row }) => (
          <span>{dayjs(row.original.createdAt).format('MMM D, YYYY')}</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Son Güncelleme" />
        ),
        cell: ({ row }) => (
          <span>{dayjs(row.original.updatedAt).fromNow()}</span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => <DataTableRowActions formId={row.original._id} />,
      },
    ],
    [mutation],
  );

  if (isPending) return <DataTableShimmer columns={4} />;
  if (isError) return <Error fullScreen={false} />;

  return (
    <DataTable<FormType, string>
      columns={columns}
      data={data.forms}
      totalEntries={data.total}
      isFetching={isFetching}
      bulkDeleteHandler={forms => {
        bulkDeleteMutation.mutate(forms);
      }}
      bulkDeleteIsLoading={bulkDeleteMutation.isPending}
      clickHandler={formId => {
        window.open(window.location.origin + '/forms/' + formId, '_blank');
      }}
    />
  );
}
