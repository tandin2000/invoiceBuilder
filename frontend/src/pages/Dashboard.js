import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { invoicesApi, clientsApi } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalClients: 0,
    totalAmount: 0,
    draftAmount: 0,
    sentAmount: 0,
    paidAmount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [invoicesRes, clientsRes] = await Promise.all([
          invoicesApi.getAll(),
          clientsApi.getAll(),
        ]);

        const invoices = invoicesRes.data;
        
        const draftAmount = invoices.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + inv.total, 0);
        const sentAmount = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);
        const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
        const totalAmount = draftAmount + sentAmount + paidAmount;

        setStats({
          totalInvoices: invoices.length,
          totalClients: clientsRes.data.length,
          totalAmount,
          draftAmount,
          sentAmount,
          paidAmount,
        });

        setRecentInvoices(invoices.slice(0, 5));
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const StatCard = ({ title, value, icon, color }) => (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        bgcolor: color,
        color: 'white',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        {icon} &nbsp;  &nbsp;
        <Typography component="h2" variant="h6" gutterBottom>
          {title}
        </Typography>
      </Box>
      <Typography component="p" variant="h4">
        {typeof value === 'number' && title.includes('Amount')
          ? `$${value.toFixed(2)}`
          : value}
      </Typography>
    </Paper>
  );

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Amount"
            value={stats.totalAmount}
            icon={<MoneyIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Draft Amount"
            value={stats.draftAmount}
            icon={<ReceiptIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Payment Awaiting"
            value={stats.sentAmount}
            icon={<ReceiptIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Amount Paid"
            value={stats.paidAmount}
            icon={<MoneyIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Recent Invoices
      </Typography>

      <Grid container spacing={2}>
        {recentInvoices.map((invoice) => (
          <Grid item xs={12} key={invoice._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice #{invoice.invoiceNumber}
                </Typography>
                <Typography color="textSecondary">
                  Client: {invoice.client?.name || 'N/A'}
                </Typography>
                <Typography color="textSecondary">
                  Amount: ${invoice.total.toFixed(2)}
                </Typography>
                <Typography color="textSecondary">
                  Status: {invoice.status}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate(`/invoices/${invoice._id}`)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {recentInvoices.length === 0 && (
        <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
          No recent invoices found
        </Typography>
      )}
    </Box>
  );
}

export default Dashboard; 