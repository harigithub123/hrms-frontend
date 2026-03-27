import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { AppButton, AppTextField, AppTypography } from '../ui'

export type GenericFormFieldConfig<TValues extends Record<string, string>> = {
  name: keyof TValues & string
  label: string
  required?: boolean
  multiline?: boolean
  rows?: number
  maxLength?: number
}

type CommonInputFormProps<TValues extends Record<string, string>> = {
  open: boolean
  title: string
  fields: Array<GenericFormFieldConfig<TValues>>
  values: TValues
  errors: Partial<Record<keyof TValues & string, string>>
  submitError?: string
  onFieldChange: (name: keyof TValues & string, value: string) => void
  onFieldBlur: (name: keyof TValues & string) => void
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
}

export function CommonInputForm<TValues extends Record<string, string>>({
  open,
  title,
  fields,
  values,
  errors,
  submitError,
  onFieldChange,
  onFieldBlur,
  onClose,
  onSubmit,
  submitLabel = 'Save',
}: CommonInputFormProps<TValues>) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {submitError && (
          <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>
            {submitError}
          </AppTypography>
        )}
        {fields.map((field) => (
          <AppTextField
            key={field.name}
            label={field.label}
            value={values[field.name]}
            onChange={(event) => onFieldChange(field.name, event.target.value)}
            onBlur={() => onFieldBlur(field.name)}
            error={!!errors[field.name]}
            helperText={errors[field.name]}
            margin="dense"
            required={field.required}
            multiline={field.multiline}
            rows={field.rows}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onClose}>Cancel</AppButton>
        <AppButton variant="contained" onClick={onSubmit}>{submitLabel}</AppButton>
      </DialogActions>
    </Dialog>
  )
}
