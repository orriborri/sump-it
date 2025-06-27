'use client'
import React from 'react'
import { AppBar, Toolbar, Typography, Box } from '@mui/material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Header = () => {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Brew', path: '/brew' },
    { name: 'Stats', path: '/stats' },
    { name: 'Manage', path: '/manage' },
  ]

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sump It
        </Typography>
        <Box sx={{ display: 'flex' }}>
          {navItems.map(item => (
            <Box
              key={item.name}
              component={Link}
              href={item.path}
              sx={{
                mx: 2,
                color: pathname === item.path ? 'primary.main' : 'text.primary',
                textDecoration: 'none',
                fontWeight: pathname === item.path ? 700 : 400,
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'none',
                },
              }}
            >
              {item.name}
            </Box>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
