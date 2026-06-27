const Brand = require('../models/Brand');
const { logAction } = require('../utils/auditLogger');

exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: brands.length, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const brand = new Brand({ name, description });
    await brand.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Create Brand', `Brand ${name}`, `Added new brand: ${name}`);

    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Brand already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    let brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    brand.name = name || brand.name;
    brand.description = description !== undefined ? description : brand.description;
    await brand.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Update Brand', `Brand ${brand.name}`, `Updated brand information`);

    res.status(200).json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    await Brand.deleteOne({ _id: req.params.id });

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Delete Brand', `Brand ${brand.name}`, `Deleted brand: ${brand.name}`);

    res.status(200).json({ success: true, message: 'Brand deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
