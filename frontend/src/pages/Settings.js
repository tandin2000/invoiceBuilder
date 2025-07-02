import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import { settingsApi } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState({
    companyName: '',
    address: '',
    termsAndConditions: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        setSettings({
          companyName: response.data.companyName || '',
          address: response.data.address || '',
          termsAndConditions: response.data.termsAndConditions || '',
        });
      } catch (error) {
        toast.error('Failed to fetch settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent>
            <Grid container spacing={3} direction="column">
              <Grid item xs={12}>
                <Typography variant="h6">Company Information</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  multiline
                  rows={4}
                  value={settings.address}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">Terms and Conditions</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Default Terms and Conditions"
                  name="termsAndConditions"
                  multiline
                  rows={8}
                  value={settings.termsAndConditions}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button type="submit" variant="contained" color="primary" disabled={saving}>
                {saving ? <CircularProgress size={24} /> : 'Save Settings'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </form>
    </Box>
  );
}

export default Settings; 