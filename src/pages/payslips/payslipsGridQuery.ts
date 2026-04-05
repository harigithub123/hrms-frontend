import type { Payslip } from '../../types/hrms'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { applyClientSideGridQuery } from '../../components/shared'

const textColumns = {
  payRunId: (p: Payslip) => String(p.payRunId),
  grossAmount: (p: Payslip) => p.grossAmount,
  deductionAmount: (p: Payslip) => p.deductionAmount,
  netAmount: (p: Payslip) => p.netAmount,
}

const sortColumns = {
  payRunId: (a: Payslip, b: Payslip, mul: number) => mul * (a.payRunId - b.payRunId),
  grossAmount: (a: Payslip, b: Payslip, mul: number) =>
    mul * (parseFloat(a.grossAmount) - parseFloat(b.grossAmount)),
  deductionAmount: (a: Payslip, b: Payslip, mul: number) =>
    mul * (parseFloat(a.deductionAmount) - parseFloat(b.deductionAmount)),
  netAmount: (a: Payslip, b: Payslip, mul: number) =>
    mul * (parseFloat(a.netAmount) - parseFloat(b.netAmount)),
}

export function applyPayslipsGridQuery(
  rows: Payslip[],
  params: GridQueryParams,
): GridQueryResult<Payslip> {
  return applyClientSideGridQuery(rows, params, { textColumns, sortColumns })
}
