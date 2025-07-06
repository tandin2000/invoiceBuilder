import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { clientsApi, invoicesApi, settingsApi } from '../services/api';

const validationSchema = yup.object({
  client: yup.string().required('Client is required'),
  issueDate: yup.date().required('Issue date is required'),
  dueDate: yup.date().required('Due date is required'),
  jobLocation: yup.string().required('Job location is required'),
  jobDate: yup.date().required('Job date is required'),
  jobStart: yup.date().nullable(),
  jobFinish: yup.date().nullable(),
  jobType: yup.array().of(yup.string()),
  descriptionOfWork: yup.string().required('Description of work is required'),
  labour: yup.array().of(
    yup.object({
      notes: yup.string(),
      type: yup.string().required(),
      hrs: yup.number().min(0).required(),
      rate: yup.number().min(0).required(),
    })
  ),
  materials: yup.array().of(
    yup.object({
      qty: yup.number().min(0).required(),
      material: yup.string().required(),
    })
  ),
  pst: yup.number().min(0),
  gst: yup.number().min(0),
  otherCharges: yup.number().min(0),
  workOrderedBy: yup.string().required('Work ordered by is required'),
});

function CreateInvoice() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialTerms, setInitialTerms] = useState('');

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const clientsResponse = await clientsApi.getAll();
        setClients(clientsResponse.data);

        const settingsResponse = await settingsApi.get();
        if (settingsResponse.data.termsAndConditions) {
          setInitialTerms(settingsResponse.data.termsAndConditions);
        }
      } catch (error) {
        toast.error(error.message);
      }
    };
    fetchDependencies();
  }, []);

  const formik = useFormik({
    initialValues: {
      client: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      jobLocation: '',
      jobDate: new Date().toISOString().split('T')[0],
      jobStart: '',
      jobFinish: '',
      jobType: [],
      descriptionOfWork: '',
      labour: [{ notes: '', type: 'FIRST HOUR', hrs: 1, rate: 0 }],
      materials: [{ qty: 1, material: '' }],
      pst: 0,
      gst: 0,
      otherCharges: 0,
      workOrderedBy: '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      console.log('Formik values:', values);
      setLoading(true);
      try {
        // Add amount to each labour item
        const payload = {
          ...values,
          labour: (values.labour || []).map(l => ({
            ...l,
            amount: Number(l.hrs) * Number(l.rate)
          })),
        };
        await invoicesApi.create(payload);
        toast.success('Invoice created successfully');
        navigate('/invoices');
      } catch (error) {
        console.error('Frontend error:', error);
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
  });

  const addLineItem = () => {
    formik.setFieldValue('lineItems', [
      ...formik.values.lineItems,
      { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  };

  const removeLabour = (index) => {
    const newLabour = formik.values.labour.filter((_, i) => i !== index);
    formik.setFieldValue('labour', newLabour);
  };

  const removeMaterial = (index) => {
    const newMaterials = formik.values.materials.filter((_, i) => i !== index);
    formik.setFieldValue('materials', newMaterials);
  };

  const calculateLabourCost = () => {
    return Array.isArray(formik.values.labour)
      ? formik.values.labour.reduce((sum, item) => sum + ((Number(item.hrs) || 0) * (Number(item.rate) || 0)), 0)
      : 0;
  };

  const calculateMaterialsCost = () => {
    return Array.isArray(formik.values.materials)
      ? formik.values.materials.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : 0;
  };

  const calculateSubtotal = () => {
    return calculateLabourCost() + calculateMaterialsCost();
  };

  const calculatePSTValue = () => {
    const pstPercent = Number(formik.values.pst) || 0;
    return (calculateSubtotal() * pstPercent) / 100;
  };

  const calculateGSTValue = () => {
    const gstPercent = Number(formik.values.gst) || 0;
    return (calculateSubtotal() * gstPercent) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const pstValue = calculatePSTValue();
    const gstValue = calculateGSTValue();
    const otherCharges = Number(formik.values.otherCharges) || 0;
    return subtotal + pstValue + gstValue + otherCharges;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Invoice
      </Typography>

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ width: '100%', boxSizing: 'border-box' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      name="client"
                      label="Client"
                      value={formik.values.client}
                      onChange={formik.handleChange}
                      error={formik.touched.client && Boolean(formik.errors.client)}
                      helperText={formik.touched.client && formik.errors.client}
                      sx={{ width: '200px' }}
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
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="jobDate"
                      label="Job Date"
                      value={formik.values.jobDate}
                      onChange={formik.handleChange}
                      error={formik.touched.jobDate && Boolean(formik.errors.jobDate)}
                      helperText={formik.touched.jobDate && formik.errors.jobDate}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      name="jobStart"
                      label="Job Start"
                      value={formik.values.jobStart}
                      onChange={formik.handleChange}
                      error={formik.touched.jobStart && Boolean(formik.errors.jobStart)}
                      helperText={formik.touched.jobStart && formik.errors.jobStart}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      name="jobFinish"
                      label="Job Finish"
                      value={formik.values.jobFinish}
                      onChange={formik.handleChange}
                      error={formik.touched.jobFinish && Boolean(formik.errors.jobFinish)}
                      helperText={formik.touched.jobFinish && formik.errors.jobFinish}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      multiple
                      name="jobType"
                      label="Job Type"
                      value={formik.values.jobType}
                      onChange={formik.handleChange}
                      error={formik.touched.jobType && Boolean(formik.errors.jobType)}
                      helperText={formik.touched.jobType && formik.errors.jobType}
                      SelectProps={{
                        multiple: true,
                        renderValue: (selected) => selected.join(', '),
                      }}
                      sx={{ width: '200px' }}
                    >
                      <MenuItem value="Day Work">Day Work</MenuItem>
                      <MenuItem value="Contract">Contract</MenuItem>
                      <MenuItem value="Extra">Extra</MenuItem>
                      <MenuItem value="Overtime">Overtime</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                      <MenuItem value="Emergency Call">Emergency Call</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="text"
                      name="jobLocation"
                      label="Job Location"
                      value={formik.values.jobLocation}
                      onChange={formik.handleChange}
                      error={formik.touched.jobLocation && Boolean(formik.errors.jobLocation)}
                      helperText={formik.touched.jobLocation && formik.errors.jobLocation}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="text"
                      name="workOrderedBy"
                      label="Work Ordered By"
                      value={formik.values.workOrderedBy}
                      onChange={formik.handleChange}
                      error={formik.touched.workOrderedBy && Boolean(formik.errors.workOrderedBy)}
                      helperText={formik.touched.workOrderedBy && formik.errors.workOrderedBy}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2} sx={{ mt: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6">Description of Work</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="descriptionOfWork"
                      label=""
                      placeholder="Enter detailed work description..."
                      value={formik.values.descriptionOfWork}
                      onChange={formik.handleChange}
                      error={formik.touched.descriptionOfWork && Boolean(formik.errors.descriptionOfWork)}
                      helperText={formik.touched.descriptionOfWork && formik.errors.descriptionOfWork}
                      sx={{ width: '400px' }}
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Labour
                </Typography>

                {formik.values.labour.map((item, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          name={`labour.${index}.notes`}
                          label="Notes"
                          value={item.notes}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.labour?.[index]?.notes &&
                            Boolean(formik.errors.labour?.[index]?.notes)
                          }
                          helperText={
                            formik.touched.labour?.[index]?.notes &&
                            formik.errors.labour?.[index]?.notes
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          select
                          name={`labour.${index}.type`}
                          label="Type"
                          value={item.type}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.labour?.[index]?.type &&
                            Boolean(formik.errors.labour?.[index]?.type)
                          }
                          helperText={
                            formik.touched.labour?.[index]?.type &&
                            formik.errors.labour?.[index]?.type
                          }
                        >
                          <MenuItem value="FIRST HOUR">FIRST HOUR</MenuItem>
                          <MenuItem value="ADDITIONAL HOUR">ADDITIONAL HOUR</MenuItem>
                          <MenuItem value="SECOND LABOUR">SECOND LABOUR</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`labour.${index}.hrs`}
                          label="Hours"
                          value={item.hrs}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.labour?.[index]?.hrs &&
                            Boolean(formik.errors.labour?.[index]?.hrs)
                          }
                          helperText={
                            formik.touched.labour?.[index]?.hrs &&
                            formik.errors.labour?.[index]?.hrs
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`labour.${index}.rate`}
                          label="Rate"
                          value={item.rate}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.labour?.[index]?.rate &&
                            Boolean(formik.errors.labour?.[index]?.rate)
                          }
                          helperText={
                            formik.touched.labour?.[index]?.rate &&
                            formik.errors.labour?.[index]?.rate
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => removeLabour(index)}
                          disabled={formik.values.labour.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => formik.setFieldValue('labour', [...formik.values.labour, { notes: '', type: 'FIRST HOUR', hrs: 1, rate: 0 }])}
                  sx={{ mb: 3 }}
                >
                  Add Labour
                </Button>

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Materials
                </Typography>

                {formik.values.materials.map((item, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`materials.${index}.qty`}
                          label="Quantity"
                          value={item.qty}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.materials?.[index]?.qty &&
                            Boolean(formik.errors.materials?.[index]?.qty)
                          }
                          helperText={
                            formik.touched.materials?.[index]?.qty &&
                            formik.errors.materials?.[index]?.qty
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          type="text"
                          name={`materials.${index}.material`}
                          label="Material"
                          value={item.material}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.materials?.[index]?.material &&
                            Boolean(formik.errors.materials?.[index]?.material)
                          }
                          helperText={
                            formik.touched.materials?.[index]?.material &&
                            formik.errors.materials?.[index]?.material
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          name={`materials.${index}.amount`}
                          label="Amount"
                          value={item.amount}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.materials?.[index]?.amount &&
                            Boolean(formik.errors.materials?.[index]?.amount)
                          }
                          helperText={
                            formik.touched.materials?.[index]?.amount &&
                            formik.errors.materials?.[index]?.amount
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => removeMaterial(index)}
                          disabled={formik.values.materials.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => formik.setFieldValue('materials', [...formik.values.materials, { qty: 1, material: '' }])}
                  sx={{ mb: 3 }}
                >
                  Add Material
                </Button>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="pst"
                      label="PST"
                      value={formik.values.pst}
                      onChange={formik.handleChange}
                      error={formik.touched.pst && Boolean(formik.errors.pst)}
                      helperText={formik.touched.pst && formik.errors.pst}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="gst"
                      label="GST"
                      value={formik.values.gst}
                      onChange={formik.handleChange}
                      error={formik.touched.gst && Boolean(formik.errors.gst)}
                      helperText={formik.touched.gst && formik.errors.gst}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="otherCharges"
                      label="Other Charges"
                      value={formik.values.otherCharges}
                      onChange={formik.handleChange}
                      error={formik.touched.otherCharges && Boolean(formik.errors.otherCharges)}
                      helperText={formik.touched.otherCharges && formik.errors.otherCharges}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ maxWidth: 320, width: '100%', mx: 'auto' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    Labour Cost
                  </Typography>
                  <Typography variant="h6">
                    ${calculateLabourCost().toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    Materials Cost
                  </Typography>
                  <Typography variant="h6">
                    ${calculateMaterialsCost().toFixed(2)}
                  </Typography>
                </Box>
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
                    PST (%)
                  </Typography>
                  <Typography variant="h6">
                    {formik.values.pst || 0}% (${calculatePSTValue().toFixed(2)})
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    GST (%)
                  </Typography>
                  <Typography variant="h6">
                    {formik.values.gst || 0}% (${calculateGSTValue().toFixed(2)})
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    Other Charges
                  </Typography>
                  <Typography variant="h6">
                    ${Number(formik.values.otherCharges || 0).toFixed(2)}
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
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Invoice'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default CreateInvoice; 