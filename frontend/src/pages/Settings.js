import React, { useState, useEffect, useRef } from 'react';
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
import SignaturePad from 'react-signature-canvas';

function Settings() {
  const [settings, setSettings] = useState({
    companyName: '',
    address: '',
    termsAndConditions: '',
    signature: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sigPadRef = useRef();
  const [sigPadError, setSigPadError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        setSettings({
          companyName: response.data.companyName || '',
          address: response.data.address || '',
          termsAndConditions: response.data.termsAndConditions || '',
          signature: response.data.signature || '',
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

  const handleSignatureDelete = () => {
    setSettings(prev => ({ ...prev, signature: '' }));
    if (sigPadRef.current) sigPadRef.current.clear();
    setSigPadError('');
  };

  const handleSignatureClear = () => {
    sigPadRef.current.clear();
    setSettings(prev => ({ ...prev, signature: '' }));
    setSigPadError('');
  };

  const handleSignatureSave = () => {
    if (sigPadRef.current.isEmpty()) {
      setSigPadError('Please provide a signature or upload an image.');
      return;
    }
    let dataUrl;
    try {
      if (typeof sigPadRef.current.getTrimmedCanvas === 'function') {
        dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      } else {
        dataUrl = sigPadRef.current.getCanvas().toDataURL('image/png');
      }
    } catch (e) {
      dataUrl = sigPadRef.current.getCanvas().toDataURL('image/png');
    }
    setSettings(prev => ({ ...prev, signature: '' }));
    setSettings(prev => ({ ...prev, signature: dataUrl }));
    setSigPadError('');
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
              <Grid item xs={12}>
                <Typography variant="h6">Signature</Typography>
                {settings.signature && (
                  <Box mb={2}>
                    <Typography variant="body2">Current Signature:</Typography>
                    <img
                      src={settings.signature}
                      alt="Signature Preview"
                      style={{ border: '1px solid #ccc', maxWidth: 300, maxHeight: 100 }}
                    />
                    <Box mt={1}>
                      <Button variant="outlined" color="error" onClick={handleSignatureDelete}>Delete Signature</Button>
                    </Box>
                  </Box>
                )}
                <Box mb={2}>
                  <SignaturePad
                    ref={sigPadRef}
                    canvasProps={{ width: 300, height: 100, className: 'sigCanvas', style: { border: '1px solid #ccc' } }}
                  />
                  <Box mt={1} display="flex" gap={1}>
                    <Button variant="outlined" onClick={handleSignatureClear}>Clear</Button>
                    <Button variant="contained" onClick={handleSignatureSave}>Save Drawing</Button>
                  </Box>
                </Box>
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