'use client'
import React from 'react'
import { AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Header = () => {
  const pathname = usePathname()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleManageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Brew', path: '/brew' },
    { name: 'Stats', path: '/stats' },
  ]

  const manageItems = [
    { name: 'Coffee Beans', path: '/manage/beans' },
    { name: 'Brew Methods', path: '/manage/methods' },
    { name: 'Grinders', path: '/manage/grinders' },
  ]

  const isManagePath = pathname.startsWith('/manage')

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sump It
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          
          <Button
            onClick={handleManageClick}
            endIcon={<ExpandMore />}
            sx={{
              mx: 1,
              color: isManagePath ? 'primary.main' : 'text.primary',
              fontWeight: isManagePath ? 700 : 400,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            Manage
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{
              '& .MuiPaper-root': {
                bgcolor: '#F5F5DC',
                border: '1px solid #8B4513',
              }
            }}
          >
            {manageItems.map(item => (
              <MenuItem
                key={item.name}
                component={Link}
                href={item.path}
                onClick={handleClose}
                sx={{
                  color: pathname === item.path ? '#8B4513' : 'text.primary',
                  fontWeight: pathname === item.path ? 600 : 400,
                  '&:hover': {
                    bgcolor: 'rgba(139, 69, 19, 0.1)',
                    color: '#8B4513',
                  },
                }}
              >
                {item.name}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
