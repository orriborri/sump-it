"use client";
import { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { BrewFeedback } from "../BrewFeedback";

// This would normally come from your database
const fetchBrew = async (id: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock data
  return {
    id: parseInt(id),
    bean_id: 1,
    method_id: 1,
    grinder_id: 1,
    water: 250,
    dose: 15,
    grind: 20,
    ratio: 16.7,
    created_at: new Date().toISOString()
  };
};

// This would normally come from your database
const fetchPreviousFeedback = async (beanId: number, methodId: number) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return mock data
  return [
    {
      brew_id: 123,
      grind: 18,
      ratio: 16,
      too_strong: false,
      too_weak: true,
      is_sour: true,
      is_bitter: false,
      overall_rating: 3,
      notes: "A bit sour and weak"
    },
    {
      brew_id: 122,
      grind: 16,
      ratio: 15,
      too_strong: true,
      too_weak: false,
      is_sour: false,
      is_bitter: true,
      overall_rating: 2.5,
      notes: "Too bitter and strong"
    }
  ];
};

// This would normally save to your database
const saveFeedback = async (feedback: any) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Saving feedback:", feedback);
  return true;
};

export default function BrewPage() {
  const params = useParams();
  const router = useRouter();
  const [brew, setBrew] = useState<any>(null);
  const [previousFeedback, setPreviousFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      if (params.id) {
        const brewData = await fetchBrew(params.id as string);
        setBrew(brewData);
        
        const feedback = await fetchPreviousFeedback(brewData.bean_id, brewData.method_id);
        setPreviousFeedback(feedback);
        
        setLoading(false);
      }
    };
    
    loadData();
  }, [params.id]);
  
  const handleSaveFeedback = async (feedback: any) => {
    await saveFeedback(feedback);
    setFeedbackSaved(true);
    
    // Redirect to stats page after a short delay
    setTimeout(() => {
      router.push('/stats');
    }, 2000);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (feedbackSaved) {
    return (
      <Box sx={{ maxWidth: 600, margin: '0 auto', mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Feedback Saved!
        </Typography>
        <Typography>
          Your brew feedback has been saved. Redirecting to stats...
        </Typography>
      </Box>
    );
  }
  
  return (
    <BrewFeedback 
      brewData={brew} 
      onSaveFeedback={handleSaveFeedback}
      previousFeedback={previousFeedback}
    />
  );
}
