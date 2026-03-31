import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import type { ReactNode } from 'react'
import { AppButton, AppTextField, AppTypography } from '../ui'

export type GenericFormFieldConfig<TValues extends Record<string, string>> = {
  name: keyof TValues & string
  label: string
  required?: boolean
  multiline?: boolean
  rows?: number
  maxLength?: number
  /** Defaults to text; use `select` with `selectOptions`. */
  type?: 'text' | 'email' | 'date' | 'select' | 'number'
  selectOptions?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
}

type CommonInputFormProps<TValues extends Record<string, string>> = {
  open: boolean
  title: string
  fields: Array<GenericFormFieldConfig<TValues>>
  values: TValues
  errors: Partial<Record<keyof TValues & string, string>>
  submitError?: string
  extraContent?: ReactNode
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
  extraContent,
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
        {fields.map((field) => {
          if (field.type === 'number') {
            return (
              <AppTextField
                key={field.name}
                label={field.label}
                type="number"
                value={values[field.name]}
                onChange={(event) => onFieldChange(field.name, event.target.value)}
                onBlur={() => onFieldBlur(field.name)}
                error={!!errors[field.name]}
                helperText={errors[field.name]}
                margin="dense"
                required={field.required}
                inputProps={{
                  min: field.min,
                  max: field.max,
                  step: field.step ?? 1,
                }}
              />
            )
          }

          if (field.type === 'select') {
            return (
              <FormControl
                key={field.name}
                fullWidth
                size="small"
                margin="dense"
                error={!!errors[field.name]}
                required={field.required}
              >
                <InputLabel>{field.label}</InputLabel>
                <Select
                  label={field.label}
                  value={values[field.name]}
                  onChange={(e) => onFieldChange(field.name, e.target.value as string)}
                  onBlur={() => onFieldBlur(field.name)}
                >
                  <MenuItem value="">
                    <em>—</em>
                  </MenuItem>
                  {(field.selectOptions ?? []).map((opt) => (
                    <MenuItem key={`${field.name}-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors[field.name] ? <FormHelperText>{errors[field.name]}</FormHelperText> : null}
              </FormControl>
            )
          }

          const inputType =
            field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'

          return (
            <AppTextField
              key={field.name}
              label={field.label}
              type={inputType}
              value={values[field.name]}
              onChange={(event) => onFieldChange(field.name, event.target.value)}
              onBlur={() => onFieldBlur(field.name)}
              error={!!errors[field.name]}
              helperText={errors[field.name]}
              margin="dense"
              required={field.required}
              multiline={field.multiline}
              rows={field.rows}
              inputProps={field.maxLength ? { maxLength: field.maxLength } : undefined}
              InputLabelProps={inputType === 'date' ? { shrink: true } : undefined}
            />
          )
        })}
        {extraContent}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onClose}>Cancel</AppButton>
        <AppButton variant="contained" onClick={onSubmit}>{submitLabel}</AppButton>
      </DialogActions>
    </Dialog>
  )
}
