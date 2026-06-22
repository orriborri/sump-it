import { Box, Button, Typography, Card, CardContent, Stack, Chip } from '@mui/material'
import { Coffee, BarChart, Settings, LocalCafe } from '@mui/icons-material'
import Link from 'next/link'
import { db } from './lib/database'
import { BeansModel } from './lib/generated-models/Beans'
import { MethodsModel } from './lib/generated-models/Methods'
import { GrindersModel } from './lib/generated-models/Grinders'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Home page component that displays a hero section with real-time stats
 * fetched from the database (beans, methods, grinders, brews counts)
 * and quick-action navigation buttons to start brewing or manage resources.
 */
const Page = async () => {
  // Fetch real stats from database
  const beansModel = new BeansModel(db)
  const methodsModel = new MethodsModel(db)
  const grindersModel = new GrindersModel(db)

  const [beansCount, methodsCount, grindersCount, brewsCount] = await Promise.all([
    beansModel.count(),
    methodsModel.count(),
    grindersModel.count(),
    db.selectFrom('brews').select(({ fn }) => fn.count<number>('id').as('count')).executeTakeFirst().then(result => result?.count ?? 0)
  ])

  return (
    <Box sx={{ py: 2 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 4, py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#654321', fontWeight: 700 }}>
          Sump It
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Your coffee brewing companion
        </Typography>
        <Button
          component={Link}
          href="/brew"
          variant="contained"
          size="large"
          startIcon={<Coffee />}
          sx={{
            py: 2,
            px: 5,
            fontSize: '1.25rem',
            fontWeight: 700,
            bgcolor: '#8B4513',
            '&:hover': { bgcolor: '#654321', transform: 'scale(1.05)' },
            transition: 'all 0.2s ease',
            borderRadius: 3,
          }}
        >
          Start Brewing
        </Button>
      </Box>

      {/* Compact Stats */}
      <Card sx={{ mb: 4, bgcolor: '#F5F5DC', border: '1px solid #8B4513' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              icon={<Coffee sx={{ color: '#8B4513' }} />}
              label={`${beansCount} Beans`}
              variant="outlined"
              sx={{ borderColor: '#8B4513', color: '#654321', fontWeight: 600 }}
            />
            <Chip
              icon={<LocalCafe sx={{ color: '#D2691E' }} />}
              label={`${methodsCount} Methods`}
              variant="outlined"
              sx={{ borderColor: '#D2691E', color: '#654321', fontWeight: 600 }}
            />
            <Chip
              icon={<Settings sx={{ color: '#A0522D' }} />}
              label={`${grindersCount} Grinders`}
              variant="outlined"
              sx={{ borderColor: '#A0522D', color: '#654321', fontWeight: 600 }}
            />
            <Chip
              icon={<Coffee sx={{ color: '#228B22' }} />}
              label={`${brewsCount} Brews`}
              variant="outlined"
              sx={{ borderColor: '#228B22', color: '#654321', fontWeight: 600 }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Secondary Quick Actions */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Button
          component={Link}
          href="/stats"
          variant="outlined"
          startIcon={<BarChart />}
          sx={{ borderColor: '#8B4513', color: '#8B4513', '&:hover': { borderColor: '#654321', bgcolor: 'rgba(139, 69, 19, 0.04)' } }}
        >
          View Stats
        </Button>
        <Button
          component={Link}
          href="/manage/beans"
          variant="outlined"
          startIcon={<LocalCafe />}
          sx={{ borderColor: '#D2691E', color: '#D2691E', '&:hover': { borderColor: '#A0522D', bgcolor: 'rgba(210, 105, 30, 0.04)' } }}
        >
          Manage Beans
        </Button>
        <Button
          component={Link}
          href="/manage/grinders"
          variant="outlined"
          startIcon={<Settings />}
          sx={{ borderColor: '#A0522D', color: '#A0522D', '&:hover': { borderColor: '#8B4513', bgcolor: 'rgba(160, 82, 45, 0.04)' } }}
        >
          Manage Grinders
        </Button>
      </Stack>
    </Box>
  )
}

export default Page
