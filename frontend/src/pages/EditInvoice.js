import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { clientsApi, invoicesApi } from '../services/api';

const validationSchema = yup.object({
  client: yup.string().required('Client is required'),
  issueDate: yup.date().required('Issue date is required'),
  dueDate: yup.date().required('Due date is required'),
  lineItems: yup.array().of(
    yup.object({
      description: yup.string().required('Description is required'),
      quantity: yup.number().required('Quantity is required').min(0, 'Quantity must be positive'),
      unitPrice: yup.number().required('Unit price is required').min(0, 'Unit price must be positive'),
      taxRate: yup.number().min(0, 'Tax rate must be positive').max(100, 'Tax rate cannot exceed 100'),
    })
  ).min(1, 'At least one line item is required'),
  notes: yup.string(),
  terms: yup.string(),
});

function EditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const formik = useFormik({
    initialValues: {
      client: '',
      issueDate: '',
      dueDate: '',
      lineItems: [],
      notes: '',
      terms: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setSaving(true);
      try {
        await invoicesApi.update(id, values);
        toast.success('Invoice updated successfully');
        navigate('/invoices');
      } catch (error) {
        toast.error(error.message);
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, clientsRes] = await Promise.all([
          invoicesApi.getById(id),
          clientsApi.getAll(),
        ]);

        const invoice = invoiceRes.data;
        formik.setValues({
          client: invoice.client._id,
          issueDate: new Date(invoice.issueDate).toISOString().split('T')[0],
          dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
          lineItems: invoice.lineItems,
          notes: invoice.notes || '',
          terms: invoice.terms || '',
        });

        setClients(clientsRes.data);
      } catch (error) {
        toast.error(error.message);
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const addLineItem = () => {
    formik.setFieldValue('lineItems', [
      ...formik.values.lineItems,
      { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  };

  const removeLineItem = (index) => {
    const newLineItems = formik.values.lineItems.filter((_, i) => i !== index);
    formik.setFieldValue('lineItems', newLineItems);
  };

  const calculateSubtotal = () => {
    return formik.values.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const calculateTaxTotal = () => {
    return formik.values.lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)),
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxTotal();
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
      <Typography variant="h4" gutterBottom>
        Edit Invoice
      </Typography>

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      name="client"
                      label="Client"
                      value={formik.values.client}
                      onChange={formik.handleChange}
                      error={formik.touched.client && Boolean(formik.errors.client)}
                      helperText={formik.touched.client && formik.errors.client}
                    >
                      {clients.map((client) => (
                        <MenuItem key={client._id} value={client._id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="issueDate"
                      label="Issue Date"
                      value={formik.values.issueDate}
                      onChange={formik.handleChange}
                      error={formik.touched.issueDate && Boolean(formik.errors.issueDate)}
                      helperText={formik.touched.issueDate && formik.errors.issueDate}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="dueDate"
                      label="Due Date"
                      value={formik.values.dueDate}
                      onChange={formik.handleChange}
                      error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                      helperText={formik.touched.dueDate && formik.errors.dueDate}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Line Items
                </Typography>

                {formik.values.lineItems.map((item, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          name={`lineItems.${index}.description`}
                          label="Description"
                          value={item.description}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.lineItems?.[index]?.description &&
                            Boolean(formik.errors.lineItems?.[index]?.description)
                          }
                          helperText={
                            formik.touched.lineItems?.[index]?.description &&
                            formik.errors.lineItems?.[index]?.description
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`lineItems.${index}.quantity`}
                          label="Quantity"
                          value={item.quantity}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.lineItems?.[index]?.quantity &&
                            Boolean(formik.errors.lineItems?.[index]?.quantity)
                          }
                          helperText={
                            formik.touched.lineItems?.[index]?.quantity &&
                            formik.errors.lineItems?.[index]?.quantity
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`lineItems.${index}.unitPrice`}
                          label="Unit Price"
                          value={item.unitPrice}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.lineItems?.[index]?.unitPrice &&
                            Boolean(formik.errors.lineItems?.[index]?.unitPrice)
                          }
                          helperText={
                            formik.touched.lineItems?.[index]?.unitPrice &&
                            formik.errors.lineItems?.[index]?.unitPrice
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`lineItems.${index}.taxRate`}
                          label="Tax Rate %"
                          value={item.taxRate}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.lineItems?.[index]?.taxRate &&
                            Boolean(formik.errors.lineItems?.[index]?.taxRate)
                          }
                          helperText={
                            formik.touched.lineItems?.[index]?.taxRate &&
                            formik.errors.lineItems?.[index]?.taxRate
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => removeLineItem(index)}
                          disabled={formik.values.lineItems.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  onClick={addLineItem}
                  sx={{ mb: 3 }}
                >
                  Add Line Item
                </Button>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="notes"
                      label="Notes"
                      value={formik.values.notes}
                      onChange={formik.handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="terms"
                      label="Terms & Conditions"
                      value={formik.values.terms}
                      onChange={formik.handleChange}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    Subtotal
                  </Typography>
                  <Typography variant="h6">
                    ${calculateSubtotal().toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    Tax Total
                  </Typography>
                  <Typography variant="h6">
                    ${calculateTaxTotal().toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    Total
                  </Typography>
                  <Typography variant="h5" color="primary">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default EditInvoice; 