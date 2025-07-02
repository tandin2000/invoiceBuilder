import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { clientsApi } from '../services/api';

const validationSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  phone: yup.string(),
  company: yup.string(),
  taxId: yup.string(),
  address: yup.object({
    street: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zipCode: yup.string(),
    country: yup.string(),
  }),
});

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'company', headerName: 'Company', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row._id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      taxId: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (selectedClient) {
          await clientsApi.update(selectedClient._id, values);
          toast.success('Client updated successfully');
        } else {
          await clientsApi.create(values);
          toast.success('Client created successfully');
        }
        handleClose();
        fetchClients();
      } catch (error) {
        toast.error(error.message);
      }
    },
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedClient(null);
    formik.resetForm();
    setOpen(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    formik.setValues(client);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsApi.delete(id);
        toast.success('Client deleted successfully');
        fetchClients();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedClient(null);
    formik.resetForm();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Client
        </Button>
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={clients}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
          getRowId={(row) => row._id}
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClient ? 'Edit Client' : 'Add New Client'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              label="Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
            <TextField
              fullWidth
              margin="normal"
              name="email"
              label="Email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField
              fullWidth
              margin="normal"
              name="phone"
              label="Phone"
              value={formik.values.phone}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="company"
              label="Company"
              value={formik.values.company}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="taxId"
              label="Tax ID"
              value={formik.values.taxId}
              onChange={formik.handleChange}
            />
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Address
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="address.street"
              label="Street"
              value={formik.values.address.street}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="address.city"
              label="City"
              value={formik.values.address.city}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="address.state"
              label="State"
              value={formik.values.address.state}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="address.zipCode"
              label="ZIP Code"
              value={formik.values.address.zipCode}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="address.country"
              label="Country"
              value={formik.values.address.country}
              onChange={formik.handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedClient ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Clients; 