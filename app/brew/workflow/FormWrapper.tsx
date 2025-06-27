"use client";
import { useState } from 'react';
import { FormData } from './types';
import { RuntimeType } from "@/app/lib/types";
import type { Beans, Methods, Grinders } from "@/app/lib/db.d";
import { Form } from './Form';
import { EnhancedBrewFeedback } from '../feedback/EnhancedBrewFeedback';
import { Box, Fade } from '@mui/material';
import { saveBrew, saveBrewFeedback } from './enhanced-actions';

interface FormWrapperProps {
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export default function FormWrapper({ beans, methods, grinders }: FormWrapperProps) {
  const [currentView, setCurrentView] = useState<'form' | 'feedback'>('form');
  const [brewData, setBrewData] = useState<FormData | null>(null);
  const [brewId, setBrewId] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const handleSubmit = async (data: FormData) => {
    console.log('Form submitted with data:', data);
    
    try {
      // Save brew using server action
      const result = await saveBrew(data);
      
      if (result.success && result.brew) {
        console.log('Brew saved to database:', result.brew);
        setBrewData(data);
        setBrewId(result.brew.id);
        setIsTransitioning(true);
        
        // Add a small delay for the transition effect
        setTimeout(() => {
          setCurrentView('feedback');
          setIsTransitioning(false);
        }, 300);
      } else {
        console.error('Failed to save brew:', result.error);
        // Still show feedback form even if save fails
        setBrewData(data);
        setIsTransitioning(true);
        
        setTimeout(() => {
          setCurrentView('feedback');
          setIsTransitioning(false);
        }, 300);
      }
    } catch (error) {
      console.error('Error saving brew:', error);
      // Still show feedback form even if save fails
      setBrewData(data);
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentView('feedback');
        setIsTransitioning(false);
      }, 300);
    }
  };
  
  const handleSaveFeedback = async (feedback: any) => {
    console.log('Feedback to save:', feedback);
    
    if (brewId) {
      try {
        // Save feedback using server action
        const result = await saveBrewFeedback(brewId, feedback);
        
        if (result.success) {
          console.log('Feedback saved to database:', result.feedback);
        } else {
          console.error('Failed to save feedback:', result.error);
        }
      } catch (error) {
        console.error('Error saving feedback:', error);
      }
    }
    
    setIsTransitioning(true);
    
    // Add a small delay for the transition effect
    setTimeout(() => {
      setCurrentView('form');
      setBrewData(null);
      setBrewId(null);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <Fade in={!isTransitioning} timeout={300}>
      <Box>
        {currentView === 'form' && (
          <Form onSubmit={handleSubmit} beans={beans} methods={methods} grinders={grinders} />
        )}
        
        {currentView === 'feedback' && brewData && (
          <EnhancedBrewFeedback 
            brewData={brewData}
            brewId={brewId ?? undefined}
            onSaveFeedback={handleSaveFeedback}
          />
        )}
      </Box>
    </Fade>
  );
}
