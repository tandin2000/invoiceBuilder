import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { invoicesApi } from '../services/api';

const statusColors = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'error',
  cancelled: 'error',
};

function ViewInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await invoicesApi.getById(id);
        setInvoice(response.data);
      } catch (error) {
        toast.error(error.message);
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, navigate]);

  const handleSend = async () => {
    setSending(true);
    try {
      await invoicesApi.send(id);
      toast.success('Invoice sent successfully');
      const response = await invoicesApi.getById(id);
      setInvoice(response.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await invoicesApi.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error.message);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/invoices')}
        >
          Back to Invoices
        </Button>
        <Box>
          <Button
            startIcon={<EditIcon />}
            onClick={() => navigate(`/invoices/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={sending || invoice.status === 'paid'}
            sx={{ mr: 1 }}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            variant="contained"
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4">
                  Invoice #{invoice.invoiceNumber}
                </Typography>
                <Chip
                  label={invoice.status}
                  color={statusColors[invoice.status]}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Client Information
              </Typography>
              <Typography variant="body1">
                {invoice.client.name}
              </Typography>
              {invoice.client.company && (
                <Typography variant="body1">
                  {invoice.client.company}
                </Typography>
              )}
              <Typography variant="body1">
                {invoice.client.address.street}
              </Typography>
              <Typography variant="body1">
                {`${invoice.client.address.city}, ${invoice.client.address.state} ${invoice.client.address.zipCode}`}
              </Typography>
              <Typography variant="body1">
                {invoice.client.address.country}
              </Typography>
              <Typography variant="body1">
                Email: {invoice.client.email}
              </Typography>
              {invoice.client.phone && (
                <Typography variant="body1">
                  Phone: {invoice.client.phone}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Invoice Details
              </Typography>
              <Typography variant="body1">
                Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body1">
                Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Line Items
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Quantity</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Tax Rate</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item, index) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      const itemTax = itemTotal * (item.taxRate / 100);
                      return (
                        <tr key={index}>
                          <td style={{ padding: '8px' }}>{item.description}</td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>
                            {item.taxRate}%
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>
                            ${(itemTotal + itemTax).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              {invoice.notes && (
                <Box mb={2}>
                  <Typography variant="h6" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body1">
                    {invoice.notes}
                  </Typography>
                </Box>
              )}
              {invoice.terms && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Terms & Conditions
                  </Typography>
                  <Typography variant="body1">
                    {invoice.terms}
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Subtotal: ${invoice.subtotal.toFixed(2)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Tax Total: ${invoice.taxTotal.toFixed(2)}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                  Total: ${invoice.total.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ViewInvoice; 