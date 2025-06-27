'use client'
import React from 'react'
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
} from '@mui/material'

interface ButtonProps extends MuiButtonProps {
  // Add any additional props specific to your button component
  rounded?: boolean
}

export const Button = ({
  children,
  variant = 'contained',
  color = 'primary',
  rounded,
  ...rest
}: ButtonProps) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      sx={{
        borderRadius: rounded ? '24px' : '4px',
        textTransform: 'none',
        ...rest.sx,
      }}
      {...rest}
    >
      {children}
    </MuiButton>
  )
}
