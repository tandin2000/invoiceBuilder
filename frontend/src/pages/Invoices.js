import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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

function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleMenuClick = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleStatusChange = async (status) => {
    if (!selectedInvoice) return;
    try {
      if (status === 'sent') {
        await invoicesApi.send(selectedInvoice._id);
        toast.success('Invoice marked as sent!');
      } else {
        await invoicesApi.updateStatus(selectedInvoice._id, status);
        toast.success(`Invoice marked as ${status}!`);
      }
      fetchInvoices();
    } catch (error) {
      toast.error(error.message);
    } finally {
      handleMenuClose();
    }
  };

  const columns = [
    { field: 'invoiceNumber', headerName: 'Invoice #', flex: 1 },
    {
      field: 'client',
      headerName: 'Client',
      flex: 1,
      valueGetter: (params) => {
        if (params?.name) {
          return params.name;
        }
        return 'N/A';
      },
    },
    {
      field: 'issueDate',
      headerName: 'Issue Date',
      flex: 1,
      valueGetter: (params) => {
        if (params) {
          return new Date(params).toLocaleDateString();
        }
        return 'N/A';
      },
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      flex: 1,
      valueGetter: (params) => {
        if (params) {
          return new Date(params).toLocaleDateString();
        }
        return 'N/A';
      },
    },
    {
      field: 'total',
      headerName: 'Total',
      flex: 1,
      valueGetter: (params) => {
        if (typeof params === 'number') {
          return `$${params.toFixed(2)}`;
        }
        return 'N/A';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={statusColors[params.value]}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClick(e, params.row);
          }}
          sx={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${params.row._id}/edit`);
            }}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClick(e, params.row)
            }}
            color="secondary"
          >
            <MoreVertIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(params.row._id)
            }}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await invoicesApi.getAll();
      // console.log('Fetched invoices:', response.data);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesApi.delete(id);
        toast.success('Invoice deleted successfully');
        fetchInvoices();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Invoices
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/invoices/create')}
        >
          Create Invoice
        </Button>
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        {invoices.length > 0 ? (
          <DataGrid
            rows={invoices}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
            checkboxSelection
            disableSelectionOnClick
            loading={loading}
            onRowClick={(params) => navigate(`/invoices/${params.row._id}`)}
            getRowId={(row) => row._id}
          />
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            {loading ? (
              <Typography>Loading invoices...</Typography>
            ) : (
              <Typography>No invoices found</Typography>
            )}
          </Box>
        )}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedInvoice?.status === 'draft' && (<MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>)}
        {selectedInvoice?.status === 'sent' && (<MenuItem onClick={() => handleStatusChange('paid')}>Paid</MenuItem>)}
        {selectedInvoice?.status === 'sent' && (<MenuItem onClick={() => handleStatusChange('draft')}>Draft</MenuItem>)}
        {selectedInvoice?.status === 'paid' && (<MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>)}
        {selectedInvoice?.status !== 'cancel' && (<MenuItem onClick={() => handleStatusChange('cancel')}>Cancel</MenuItem>)}
        {selectedInvoice?.status === 'cancel' && (<MenuItem onClick={() => handleStatusChange('draft')}>Draft</MenuItem>)}
        {selectedInvoice?.status !== 'overdue' && (<MenuItem onClick={() => handleStatusChange('overdue')}>Overdue</MenuItem>)}
        {selectedInvoice?.status === 'overdue' && (<MenuItem onClick={() => handleStatusChange('sent')}>Sent</MenuItem>)}
      </Menu>
    </Box>
  );
}

export default Invoices; 