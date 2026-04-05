import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { Payslip } from '../../types/hrms'
import { AppButton } from '../../components/ui'

export function getPayslipColumnDefs(onDownload: (id: number) => void): ColDef<Payslip>[] {
  return [
    {
      headerName: 'Run',
      field: 'payRunId',
      width: 110,
      maxWidth: 140,
      valueFormatter: (p) => (p.value != null ? `#${p.value}` : ''),
    },
    { headerName: 'Gross', field: 'grossAmount' },
    { headerName: 'Deductions', field: 'deductionAmount' },
    { headerName: 'Net', field: 'netAmount' },
    {
      headerName: 'PDF',
      colId: 'pdf',
      sortable: false,
      filter: false,
      width: 130,
      maxWidth: 150,
      cellRenderer: (params: ICellRendererParams<Payslip>) => {
        if (!params.data) return null
        return (
          <AppButton size="small" onClick={() => onDownload(params.data!.id)}>
            Download
          </AppButton>
        )
      },
    },
  ]
}
