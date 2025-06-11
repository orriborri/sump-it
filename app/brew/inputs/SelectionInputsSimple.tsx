"use client";
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography,
  SelectChangeEvent 
} from '@mui/material';
import { FormData } from '../types';

// Mock data - in a real app, these would be fetched from an API or database
const mockBeans = [
  { id: '1', name: 'Ethiopian Yirgacheffe' },
  { id: '2', name: 'Colombian Supremo' },
  { id: '3', name: 'Kenyan AA' }
];

const mockMethods = [
  { id: '1', name: 'Pour Over' },
  { id: '2', name: 'French Press' },
  { id: '3', name: 'AeroPress' }
];

const mockGrinders = [
  { id: '1', name: 'Baratza Encore' },
  { id: '2', name: 'Comandante C40' },
  { id: '3', name: 'Timemore C2' }
];

interface SelectionInputsSimpleProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent) => void;
}

export const SelectionInputsSimple: React.FC<SelectionInputsSimpleProps> = ({
  formData,
  handleChange
}) => {
  const [beans, setBeans] = useState(mockBeans);
  const [methods, setMethods] = useState(mockMethods);
  const [grinders, setGrinders] = useState(mockGrinders);
  
  // In a real application, you would fetch data here
  useEffect(() => {
    // Example of fetching data:
    // const fetchData = async () => {
    //   const beansData = await fetch('/api/beans').then(res => res.json());
    //   setBeans(beansData);
    //   // Similar for methods and grinders
    // };
    // fetchData();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Select the coffee beans, brewing method, and grinder for your brew.
      </Typography>
      
      <FormControl fullWidth>
        <InputLabel id="bean-select-label">Coffee Beans</InputLabel>
        <Select
          labelId="bean-select-label"
          id="bean-select"
          name="bean_id"
          value={formData.bean_id}
          label="Coffee Beans"
          onChange={handleChange}
        >
          {beans.map((bean) => (
            <MenuItem key={bean.id} value={bean.id}>
              {bean.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth>
        <InputLabel id="method-select-label">Brewing Method</InputLabel>
        <Select
          labelId="method-select-label"
          id="method-select"
          name="method_id"
          value={formData.method_id}
          label="Brewing Method"
          onChange={handleChange}
        >
          {methods.map((method) => (
            <MenuItem key={method.id} value={method.id}>
              {method.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth>
        <InputLabel id="grinder-select-label">Grinder</InputLabel>
        <Select
          labelId="grinder-select-label"
          id="grinder-select"
          name="grinder_id"
          value={formData.grinder_id}
          label="Grinder"
          onChange={handleChange}
        >
          {grinders.map((grinder) => (
            <MenuItem key={grinder.id} value={grinder.id}>
              {grinder.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};