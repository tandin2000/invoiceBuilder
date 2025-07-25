import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import api from '../services/api';

const EMAIL = process.env.REACT_APP_LOGIN_EMAIL;

const Login = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/otp/send-otp');
      setOtpSent(true);
      toast.success('OTP sent to info@kpmservicegroup.ca');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await api.post('/otp/verify-otp', { otp });
      toast.success('Device verified!');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <Typography variant="h4" mb={2}>Login - Device Verification</Typography>
      <Typography mb={2}>First time device registration for <b>{EMAIL}</b></Typography>
      {!otpSent ? (
        <Button variant="contained" color="primary" onClick={handleSendOtp} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Send OTP'}
        </Button>
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <TextField
            label="Enter OTP"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            variant="outlined"
            autoFocus
          />
          <Button variant="contained" color="primary" onClick={handleVerifyOtp} disabled={loading || !otp}>
            {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Login; 