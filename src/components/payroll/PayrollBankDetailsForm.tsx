import { useEffect, useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material'
import type { OnboardingBankDetails } from '../../types/hrms'
import { AppButton, AppTextField, AppTypography } from '../ui'

export type PayrollBankFormPayload = {
  accountHolderName: string
  bankName: string
  branch: string | null
  accountNumber: string
  ifscCode: string
  accountType: 'SAVINGS' | 'CURRENT'
  notes: string | null
  /** ISO date yyyy-MM-dd */
  effectiveFrom: string
}

type PayrollBankDetailsFormProps = {
  bankDetails: OnboardingBankDetails | null
  /** When true, fields and save are disabled (e.g. cancelled case, or bank details already saved). */
  disabled?: boolean
  onSave: (body: PayrollBankFormPayload) => Promise<void>
  showHeading?: boolean
}

export function PayrollBankDetailsForm({
  bankDetails,
  disabled = false,
  onSave,
  showHeading = true,
}: PayrollBankDetailsFormProps) {
  const b = bankDetails
  const [holder, setHolder] = useState(b?.accountHolderName ?? '')
  const [bankName, setBankName] = useState(b?.bankName ?? '')
  const [branch, setBranch] = useState(b?.branch ?? '')
  const [accountNumber, setAccountNumber] = useState(b?.accountNumber ?? '')
  const [ifsc, setIfsc] = useState(b?.ifscCode ?? '')
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT'>(b?.accountType ?? 'SAVINGS')
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [effectiveFrom, setEffectiveFrom] = useState(() => b?.effectiveFrom ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHolder(b?.accountHolderName ?? '')
    setBankName(b?.bankName ?? '')
    setBranch(b?.branch ?? '')
    setAccountNumber(b?.accountNumber ?? '')
    setIfsc(b?.ifscCode ?? '')
    setAccountType(b?.accountType ?? 'SAVINGS')
    setNotes(b?.notes ?? '')
    setEffectiveFrom(b?.effectiveFrom ?? '')
  }, [
    b?.accountHolderName,
    b?.accountNumber,
    b?.accountType,
    b?.bankName,
    b?.branch,
    b?.effectiveFrom,
    b?.id,
    b?.ifscCode,
    b?.notes,
    b?.updatedAt,
  ])

  const save = async () => {
    if (!holder.trim() || !bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      return
    }
    const eff =
      effectiveFrom.trim() ||
      new Date().toISOString().slice(0, 10)
    setSaving(true)
    try {
      await onSave({
        accountHolderName: holder.trim(),
        bankName: bankName.trim(),
        branch: branch.trim() || null,
        accountNumber: accountNumber.trim(),
        ifscCode: ifsc.trim(),
        accountType,
        notes: notes.trim() || null,
        effectiveFrom: eff,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ pt: showHeading ? 1 : 0 }}>
      {showHeading && (
        <>
          <AppTypography variant="subtitle2" fontWeight={700} gutterBottom>
            Bank account (payroll)
          </AppTypography>
          {disabled && bankDetails != null && (
            <AppTypography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Bank details are saved and cannot be changed.
            </AppTypography>
          )}
        </>
      )}
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <AppTextField
            size="small"
            label="Account holder name"
            value={holder}
            disabled={disabled}
            onChange={(e) => setHolder(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <AppTextField
            size="small"
            label="Bank name"
            value={bankName}
            disabled={disabled}
            onChange={(e) => setBankName(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <AppTextField
            size="small"
            label="Branch"
            value={branch}
            disabled={disabled}
            onChange={(e) => setBranch(e.target.value)}
            sx={{ minWidth: 160 }}
          />
        </Stack>
        <AppTextField
          size="small"
          label="Effective from (payroll)"
          type="date"
          value={effectiveFrom}
          disabled={disabled}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: 220 }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <AppTextField
            size="small"
            label="Account number"
            value={accountNumber}
            disabled={disabled}
            onChange={(e) => setAccountNumber(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <AppTextField
            size="small"
            label="IFSC"
            value={ifsc}
            disabled={disabled}
            onChange={(e) => setIfsc(e.target.value)}
            sx={{ minWidth: 140 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Account type</InputLabel>
            <Select
              label="Account type"
              value={accountType}
              disabled={disabled}
              onChange={(e) => setAccountType(e.target.value as 'SAVINGS' | 'CURRENT')}
            >
              <MenuItem value="SAVINGS">Savings</MenuItem>
              <MenuItem value="CURRENT">Current</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <AppTextField
          size="small"
          label="Notes"
          value={notes}
          disabled={disabled}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        {!disabled && (
          <AppButton variant="outlined" onClick={save} disabled={saving}>
            Save bank details
          </AppButton>
        )}
      </Stack>
    </Box>
  )
}
