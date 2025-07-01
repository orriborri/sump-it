import { db } from '../lib/database'
import { Box, Typography } from '@mui/material'
import FormWrapper from './FormWrapper'
import { BeansModel } from '../lib/generated-models/Beans'
import { MethodsModel } from '../lib/generated-models/Methods'
import { GrindersModel } from '../lib/generated-models/Grinders'

// Force dynamic rendering since we need database access
export const dynamic = 'force-dynamic'

const Page = async () => {
  // Initialize models with database connection
  const beansModel = new BeansModel(db)
  const methodsModel = new MethodsModel(db)
  const grindersModel = new GrindersModel(db)

  // Use generated models for data fetching
  const beans = await beansModel.findAll()
  const methods = await methodsModel.findAll()
  const grinders = await grindersModel.findAll()

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          textAlign: { xs: 'center', sm: 'left' },
        }}
      >
        Coffee Brewing
      </Typography>

      <FormWrapper beans={beans} methods={methods} grinders={grinders} />
    </Box>
  )
}

export default Page
