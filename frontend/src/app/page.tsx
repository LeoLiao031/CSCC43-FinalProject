"use client";
import { Box, Tabs, Tab } from "@mui/material";
import { useState } from "react";

interface HomeProps {
  children?: React.ReactNode;
}

export default function Home({ children }: HomeProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              color: 'white',
              '&.Mui-selected': {
                color: 'white',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'white',
            },
          }}
        >
          <Tab label="Account" />
          <Tab label="Portfolios" />
          <Tab label="Stock Lists" />
          <Tab label="Predict" />
          <Tab label="Friends" />
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
