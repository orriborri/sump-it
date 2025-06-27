import { db } from "../../lib/database";
import { BrewsModel } from "../../lib/generated-models/Brews";
import { BeansModel } from "../../lib/generated-models/Beans";
import { MethodsModel } from "../../lib/generated-models/Methods";
import { GrindersModel } from "../../lib/generated-models/Grinders";
import { Box, Typography, Alert } from "@mui/material";
import { SharedBrewFeedback } from "./SharedBrewFeedback";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const SharedBrewPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const brewId = parseInt(id);
  
  if (isNaN(brewId)) {
    notFound();
  }

  // Initialize models
  const brewsModel = new BrewsModel(db);
  const beansModel = new BeansModel(db);
  const methodsModel = new MethodsModel(db);
  const grindersModel = new GrindersModel(db);

  try {
    // Get brew details
    const brew = await brewsModel.findById(brewId);
    
    if (!brew) {
      notFound();
    }

    // Get related data
    const [bean, method, grinder] = await Promise.all([
      brew.bean_id ? beansModel.findById(brew.bean_id) : null,
      brew.method_id ? methodsModel.findById(brew.method_id) : null,
      brew.grinder_id ? grindersModel.findById(brew.grinder_id) : null,
    ]);

    const brewDetails = {
      ...brew,
      bean_name: bean?.name || "Unknown Bean",
      method_name: method?.name || "Unknown Method",
      grinder_name: grinder?.name || "Unknown Grinder",
      created_at: brew.created_at.toISOString(),
    };

    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Shared Brew Feedback
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Someone shared their coffee brew with you! Help them improve by providing feedback.
        </Alert>

        <SharedBrewFeedback brewDetails={brewDetails} />
      </Box>
    );
  } catch (error) {
    console.error("Error loading brew details:", error);
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Error Loading Brew
        </Typography>
        <Alert severity="error">
          Sorry, we couldn&apos;t load the brew details. Please check the link and try again.
        </Alert>
      </Box>
    );
  }
};

export default SharedBrewPage;
