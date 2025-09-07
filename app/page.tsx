import { Box, Button, Stack, Typography, Paper, Grid, Card, CardContent, Avatar, Chip } from '@mui/material'
import { Coffee, BarChart, Settings, Tune, LocalCafe, Add, Dashboard, TrendingUp } from '@mui/icons-material'
import Link from 'next/link'

const Page = () => {
  const navigationCards = [
    {
      title: "Let's brew coffee",
      description: 'Start a new brewing session with step-by-step guidance',
      href: '/brew',
      color: 'primary',
      icon: <Coffee sx={{ fontSize: 40 }} />,
    },
    {
      title: 'View Stats',
      description: 'Analyze your brewing history and performance',
      href: '/stats',
      color: 'secondary',
      icon: <BarChart sx={{ fontSize: 40 }} />,
    },
    {
      title: 'Manage Beans',
      description: 'Add and edit your coffee bean collection',
      href: '/manage/beans',
      color: 'info',
      icon: <Coffee sx={{ fontSize: 40 }} />,
    },
    {
      title: 'Manage Grinders',
      description: 'Configure your grinder settings and preferences',
      href: '/manage/grinders',
      color: 'success',
      icon: <Tune sx={{ fontSize: 40 }} />,
    },
  ]

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Sump It
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Your comprehensive coffee brewing companion
        </Typography>
      </Box>

      {/* Coffee Setup Stats */}
      <Typography variant="h5" sx={{ color: '#8B4513', fontWeight: 600, mb: 3 }}>
        Your Coffee Setup
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            bgcolor: '#F5F5DC', 
            border: '2px solid #8B4513',
            textAlign: 'center',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent>
              <Avatar sx={{ bgcolor: '#8B4513', mx: 'auto', mb: 1 }}>
                <Coffee />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#654321' }}>12</Typography>
              <Typography variant="body2" color="text.secondary">Coffee Beans</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            bgcolor: '#F5F5DC', 
            border: '2px solid #D2691E',
            textAlign: 'center',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent>
              <Avatar sx={{ bgcolor: '#D2691E', mx: 'auto', mb: 1 }}>
                <LocalCafe />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#654321' }}>5</Typography>
              <Typography variant="body2" color="text.secondary">Brew Methods</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            bgcolor: '#F5F5DC', 
            border: '2px solid #A0522D',
            textAlign: 'center',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent>
              <Avatar sx={{ bgcolor: '#A0522D', mx: 'auto', mb: 1 }}>
                <Settings />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#654321' }}>3</Typography>
              <Typography variant="body2" color="text.secondary">Grinders</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            bgcolor: '#F5F5DC', 
            border: '2px solid #8B4513',
            textAlign: 'center',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent>
              <Avatar sx={{ bgcolor: '#228B22', mx: 'auto', mb: 1 }}>
                <TrendingUp />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#654321' }}>47</Typography>
              <Typography variant="body2" color="text.secondary">Total Brews</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4, bgcolor: '#F5F5DC', border: '2px solid #8B4513' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Dashboard sx={{ color: '#8B4513' }} />
            <Typography variant="h6" sx={{ color: '#8B4513' }}>Quick Actions</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/brew"
                variant="contained"
                startIcon={<Coffee />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Start Brewing
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/manage/grinders"
                variant="contained"
                startIcon={<Settings />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Manage Grinders
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/manage/beans"
                variant="contained"
                startIcon={<LocalCafe />}
                fullWidth
                sx={{ py: 1.5, bgcolor: '#D2691E', '&:hover': { bgcolor: '#B8860B' } }}
              >
                Manage Beans
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/stats"
                variant="outlined"
                startIcon={<BarChart />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                View Stats
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {navigationCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6 }} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(139, 69, 19, 0.2)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    color: `${card.color}.main`,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
                  {card.title}
                </Typography>
              </Box>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, flexGrow: 1 }}
              >
                {card.description}
              </Typography>

              <Button
                component={Link}
                href={card.href}
                variant={index === 0 ? 'contained' : 'outlined'}
                color={card.color as 'primary' | 'secondary' | 'info' | 'success'}
                size="large"
                fullWidth
                sx={{ mt: 'auto' }}
              >
                {card.title}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default Page
