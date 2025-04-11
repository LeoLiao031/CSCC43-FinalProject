"use client";
import { Box, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import AccountTab from "./components/AccountTab";
import PortfolioTab from "./components/PortfolioTab";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loginStatus, setLoginStatus] = useState(false);
  const [username, setUsername] = useState("");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleLoginStatusChange = (status: boolean, user?: string) => {
    setLoginStatus(status);
    if (user) {
      setUsername(user);
    } else {
      setUsername("");
    }
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0:
        return <AccountTab loginStatus={loginStatus} setLoginStatus={handleLoginStatusChange} />;
      case 1:
        return <PortfolioTab loginStatus={loginStatus} username={username} />;
      case 2:
        return <div>Stock Lists</div>;
      case 3:
        return <div>Predict</div>;
      case 4:
        return <div>Friends</div>;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
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
      {renderTabContent()}
    </Box>
  );
}
