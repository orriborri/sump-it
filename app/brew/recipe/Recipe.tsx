"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
} from "@mui/material";
import { FormData } from "../workflow/types";
import { getPreviousBrews } from "../workflow/actions";

interface Brew {
  id: number;
  bean_id: number;
  method_id: number;
  grinder_id: number;
  water: number;
  dose: number;
  grind: number;
  ratio: number;
  created_at: string;
}

interface RecipeProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export const Recipe: React.FC<RecipeProps> = ({
  formData,
  updateFormData,
}) => {
  const [previousBrews, setPreviousBrews] = useState<Brew[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    const fetchBrews = async () => {
      if (!formData.bean_id || !formData.method_id || !formData.grinder_id) {
        setPreviousBrews([]);
        return;
      }

      setLoading(true);
      try {
        const brews = await getPreviousBrews(
          formData.bean_id,
          formData.method_id,
          formData.grinder_id
        );
        setPreviousBrews(brews);
      } catch (error) {
        console.error("Error fetching brews:", error);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };

    fetchBrews();
  }, [formData.bean_id, formData.method_id, formData.grinder_id]);

  const handleSelectBrew = (brew: Brew) => {
    updateFormData({
      water: brew.water,
      dose: brew.dose,
      grind: brew.grind,
      ratio: brew.ratio,
    });
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Loading previous brews...
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={140} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (loaded && previousBrews.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          No previous brews found with this combination
        </Typography>
        <Typography variant="body2">
          Continue to set up a new brew with your selected parameters.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Previous brews with the same beans, method, and grinder
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Select a previous brew to use its parameters as a starting point.
      </Typography>

      <Grid container spacing={2}>
        {previousBrews.map((brew) => (
          <Grid item xs={12} sm={6} md={4} key={brew.id}>
            <Card
              sx={{
                cursor: "pointer",
                "&:hover": { boxShadow: 3 },
              }}
              onClick={() => handleSelectBrew(brew)}
            >
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Brew #{brew.id}
                </Typography>
                <Typography variant="body2">Water: {brew.water}ml</Typography>
                <Typography variant="body2">Coffee: {brew.dose}g</Typography>
                <Typography variant="body2">Ratio: 1:{brew.ratio}</Typography>
                <Typography variant="body2">
                  Grind Setting: {brew.grind}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(brew.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
