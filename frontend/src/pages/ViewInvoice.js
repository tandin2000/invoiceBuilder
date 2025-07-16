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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { invoicesApi } from '../services/api';

const statusColors = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'error',
  cancel: 'error',
};

function ViewInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

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

  const handleStatusMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = async (status) => {
    try {
      if (status === 'sent') {
        await invoicesApi.send(id);
        toast.success('Invoice marked as sent!');
      } else {
        await invoicesApi.updateStatus(id, status);
        toast.success(`Invoice marked as ${status}!`);
      }
      // Refresh the invoice data
      const response = await invoicesApi.getById(id);
      setInvoice(response.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      handleStatusMenuClose();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Helper for job type checkboxes
  const jobTypes = ['Day Work', 'Contract', 'Extra', 'Overtime', 'Other', 'Emergency Call'];

  // Calculate totals
  const totalMaterials = (invoice.materials || []).reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalLabour = (invoice.labour || []).reduce((sum, l) => sum + (l.amount || 0), 0);
  const subtotal = totalMaterials + totalLabour;
  const pstPercent = invoice.pst || 0;
  const gstPercent = invoice.gst || 0;
  // PST and GST should be applied only to totalLabour
  const pst = (totalLabour * pstPercent) / 100;
  const gst = (totalLabour * gstPercent) / 100;
  const otherCharges = invoice.otherCharges || 0;
  const total = subtotal + pst + gst + otherCharges;

  // Helper function to format datetime
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

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
          {/* Header Section */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center">
                <img src="/company-logo.png" alt="Company Logo" style={{ width:300, marginRight: 16 }} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box textAlign="right">
                <Typography variant="h6">Work Order / Invoice</Typography>
                <Typography variant="body2">Invoice #: {invoice.invoiceNumber}</Typography>
                <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                  <Typography variant="body2">Status: </Typography>
                  <Chip 
                    label={invoice.status} 
                    color={statusColors[invoice.status]} 
                    size="small" 
                    onClick={handleStatusMenuClick}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Invoice/Job Details */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold">Invoice Details</Typography>
              <Typography variant="body2">Issue Date: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ''}</Typography>
              <Typography variant="body2">Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ''}</Typography>
              <Typography variant="body2">Work Ordered By: {invoice.workOrderedBy}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold">Job Details</Typography>
              <Typography variant="body2">Job Location: {invoice.jobLocation}</Typography>
              <Typography variant="body2">Job Date: {invoice.jobDate ? new Date(invoice.jobDate).toLocaleDateString() : ''}</Typography>
              <Typography variant="body2">Job Start: {invoice.jobStart ? formatDateTime(invoice.jobStart) : ''}</Typography>
              <Typography variant="body2">Job Finish: {invoice.jobFinish ? formatDateTime(invoice.jobFinish) : ''}</Typography>
            </Grid>
          </Grid>

          {/* Customer Information */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold">Customer Information</Typography>
              <Typography variant="body2">Email: {invoice.customerEmail}</Typography>
              <Typography variant="body2">Customer Number: {invoice.customerNumber}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold">Job Type</Typography>
              <FormGroup row>
                {jobTypes.map(type => (
                  <FormControlLabel
                    key={type}
                    control={<Checkbox checked={invoice.jobType && invoice.jobType.includes(type)} disabled />}
                    label={type}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>

          {/* To Section */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">To</Typography>
            <Typography variant="body2">{invoice.client?.name}</Typography>
            {invoice.client?.company && <Typography variant="body2">{invoice.client.company}</Typography>}
            {invoice.client?.address?.street && <Typography variant="body2">{invoice.client.address.street}</Typography>}
            {(invoice.client?.address?.city || invoice.client?.address?.state || invoice.client?.address?.zipCode) && (
              <Typography variant="body2">{`${invoice.client.address.city || ''}, ${invoice.client.address.state || ''} ${invoice.client.address.zipCode || ''}`}</Typography>
            )}
            {invoice.client?.address?.country && <Typography variant="body2">{invoice.client.address.country}</Typography>}
          </Box>

          {/* Description of Work */}
          <Box sx={{ mt: 2, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">DESCRIPTION OF WORK</Typography>
            <Typography variant="body2">{invoice.descriptionOfWork}</Typography>
          </Box>

          {/* Labour Table */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Labour</Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Notes</TableCell>
                    <TableCell>Labour Type</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invoice.labour || []).map((lab, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{lab.notes}</TableCell>
                      <TableCell>{lab.type}</TableCell>
                      <TableCell>{lab.hrs}</TableCell>
                      <TableCell>${lab.rate?.toFixed(2)}</TableCell>
                      <TableCell>${lab.amount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Materials Table */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Materials</Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invoice.materials || []).map((mat, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{mat.qty}</TableCell>
                      <TableCell>{mat.material}</TableCell>
                      <TableCell>${mat.amount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Summary and Footer */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold">WORK ORDERED BY</Typography>
              <Typography variant="body2">{invoice.workOrderedBy}</Typography>
              <Typography variant="body2">DATE: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ''}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" fontWeight="bold">INVOICE SUMMARY</Typography>
                <Typography variant="body2">TOTAL MATERIALS: ${totalMaterials.toFixed(2)}</Typography>
                <Typography variant="body2">TOTAL LABOUR: ${totalLabour.toFixed(2)}</Typography>
                <Typography variant="body2">SUBTOTAL: ${subtotal.toFixed(2)}</Typography>
                <Typography variant="body2">PST ({pstPercent}%): ${pst.toFixed(2)}</Typography>
                <Typography variant="body2">GST ({gstPercent}%): ${gst.toFixed(2)}</Typography>
                <Typography variant="body2">OTHER CHARGES: ${otherCharges.toFixed(2)}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" fontWeight="bold">TOTAL: ${total.toFixed(2)}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Footer Note */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {invoice.footerNote || 'THANK YOU FOR THE BUSINESS'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Status Change Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleStatusMenuClose}
      >
        {invoice?.status === 'draft' && (
          <MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>
        )}
        {invoice?.status === 'sent' && (
          <MenuItem onClick={() => handleStatusChange('paid')}>Paid</MenuItem>
        )}
        {invoice?.status === 'sent' && (
          <MenuItem onClick={() => handleStatusChange('draft')}> Draft</MenuItem>
        )}
        {invoice?.status === 'paid' && (
          <MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>
        )}
        {invoice?.status !== 'cancel' && (
          <MenuItem onClick={() => handleStatusChange('cancel')}>Cancel</MenuItem>
        )}
        {invoice?.status === 'cancel' && (
          <MenuItem onClick={() => handleStatusChange('draft')}>Draft</MenuItem>
        )}
        {invoice?.status !== 'overdue' && (
          <MenuItem onClick={() => handleStatusChange('overdue')}>Overdue</MenuItem>
        )}
        {invoice?.status === 'overdue' && (
          <MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>
        )}
      </Menu>
    </Box>
  );
}

export default ViewInvoice; 