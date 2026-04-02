import {
  Box,
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
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { AppButton, AppTextField, AppTypography } from '../ui'

export type GenericFormFieldConfig<TValues extends Record<string, string>> = {
  name: keyof TValues & string
  label: string
  required?: boolean
  /** Render the input as read-only (non-editable) while keeping it visible. */
  readOnly?: boolean
  multiline?: boolean
  rows?: number
  maxLength?: number
  /** Defaults to text; use `select` with `selectOptions`. */
  type?: 'text' | 'email' | 'date' | 'select' | 'number'
  selectOptions?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  /**
   * When `fieldsPerRow` > 1, this field spans the full row (e.g. a wide select above a 2-column row).
   * Ignored when `fieldsPerRow` is 1.
   */
  fullRow?: boolean
}

/** Use on `Box` for multi-column layouts outside `CommonInputForm` (e.g. component + amount rows). */
export function getFormFieldsGridSx(fieldsPerRow: number): SxProps<Theme> {
  const cols = Math.min(12, Math.max(1, Math.round(fieldsPerRow)))
  if (cols <= 1) {
    return {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: 2,
      alignItems: 'start',
    }
  }
  return {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: `repeat(${cols}, minmax(0, 1fr))` },
    gap: 2,
    alignItems: 'start',
  }
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
  /** Defaults to `sm`. Use `md` when `extraContent` needs more horizontal space. */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /**
   * How many fields sit on one row from `sm` breakpoint up. On `xs`, fields stack in a single column.
   * @default 1
   */
  fieldsPerRow?: number
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
  maxWidth = 'sm',
  fieldsPerRow = 1,
}: CommonInputFormProps<TValues>) {
  const cols = Math.min(12, Math.max(1, Math.round(fieldsPerRow)))

  const renderField = (field: GenericFormFieldConfig<TValues>) => {
    if (field.type === 'number') {
      return (
        <AppTextField
          label={field.label}
          type="number"
          value={values[field.name]}
          onChange={(event) => {
            if (field.readOnly) return
            onFieldChange(field.name, event.target.value)
          }}
          onBlur={() => {
            if (field.readOnly) return
            onFieldBlur(field.name)
          }}
          error={!!errors[field.name]}
          helperText={errors[field.name]}
          margin="dense"
          required={field.required}
          inputProps={{
            min: field.min,
            max: field.max,
            step: field.step ?? 1,
            readOnly: field.readOnly ?? undefined,
          }}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <FormControl
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
            disabled={field.readOnly}
            onChange={(e) => {
              if (field.readOnly) return
              onFieldChange(field.name, e.target.value as string)
            }}
            onBlur={() => {
              if (field.readOnly) return
              onFieldBlur(field.name)
            }}
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

    const inputType = field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'

    return (
      <AppTextField
        label={field.label}
        type={inputType}
        value={values[field.name]}
        onChange={(event) => {
          if (field.readOnly) return
          onFieldChange(field.name, event.target.value)
        }}
        onBlur={() => {
          if (field.readOnly) return
          onFieldBlur(field.name)
        }}
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
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth === false ? false : maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {submitError && (
          <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>
            {submitError}
          </AppTypography>
        )}
        <Box sx={getFormFieldsGridSx(cols)}>
          {fields.map((field) => (
            <Box
              key={field.name}
              sx={{
                minWidth: 0,
                gridColumn: {
                  xs: '1 / -1',
                  sm: cols <= 1 || field.fullRow ? '1 / -1' : 'span 1',
                },
              }}
            >
              {renderField(field)}
            </Box>
          ))}
        </Box>
        {extraContent}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onClose}>Cancel</AppButton>
        <AppButton variant="contained" onClick={onSubmit}>{submitLabel}</AppButton>
      </DialogActions>
    </Dialog>
  )
}
