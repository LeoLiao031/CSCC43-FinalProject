"use client";
import { Box, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import AccountTab from "./components/AccountTab";
import PortfolioTab from "./components/PortfolioTab";
import FriendsTab from "./components/FriendsTab";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loginStatus, setLoginStatus] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleLoginStatusChange = (status: boolean, user?: string, id?: number) => {
    setLoginStatus(status);
    if (user && id) {
      setUsername(user);
      setUserId(id);
    } else {
      setUsername("");
      setUserId(0);
    }
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0:
        return <AccountTab loginStatus={loginStatus} setLoginStatus={handleLoginStatusChange} username={username} setUsername={setUsername} />;
      case 1:
        return <PortfolioTab loginStatus={loginStatus} username={username} userId={userId} />;
      case 2:
        return <div>Stock Lists</div>;
      case 3:
        return <div>Predict</div>;
      case 4:
        return <FriendsTab loginStatus={loginStatus} userId={userId} username={username} />;
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
