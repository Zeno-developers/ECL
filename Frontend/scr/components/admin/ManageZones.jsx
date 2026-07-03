import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { zonesAPI, membersAPI } from '../../utils/api';
import { Plus, Edit, Trash2, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function ManageZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [zoneMembers, setZoneMembers] = useState({});
  const [loadingMembers, setLoadingMembers] = useState({});
  const [memberActionLoading, setMemberActionLoading] = useState({});
  const [transferTargets, setTransferTargets] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    pastor_id: null
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await zonesAPI.getAll();
      setZones(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error loading zones:', error);
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const loadZoneMembers = async (zoneId) => {
    if (loadingMembers[zoneId]) return;
    
    try {
      setLoadingMembers(prev => ({ ...prev, [zoneId]: true }));
      const data = await membersAPI.getAll({ zone_id: zoneId });
      const members = Array.isArray(data) ? data : data?.data || [];
      setZoneMembers(prev => ({
        ...prev,
        [zoneId]: members
      }));
    } catch (error) {
      console.error('Error loading zone members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(prev => ({ ...prev, [zoneId]: false }));
    }
  };

  const toggleExpandZone = (zoneId) => {
    if (expandedZoneId === zoneId) {
      setExpandedZoneId(null);
    } else {
      setExpandedZoneId(zoneId);
      if (!zoneMembers[zoneId]) {
        loadZoneMembers(zoneId);
      }
    }
  };

  const refreshZoneData = async (...zoneIds) => {
    await loadZones();
    const uniqueIds = [...new Set(zoneIds.filter(Boolean))];
    await Promise.all(uniqueIds.map((zoneId) => loadZoneMembers(zoneId)));
  };

  const handleRemoveMember = async (zoneId, memberId) => {
    if (!window.confirm('Remove this member from the zone?')) return;

    try {
      setMemberActionLoading((prev) => ({ ...prev, [`remove-${memberId}`]: true }));
      await zonesAPI.removeMember(zoneId, memberId);
      toast.success('Member removed from zone');
      await refreshZoneData(zoneId);
    } catch (error) {
      console.error('Error removing member from zone:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [`remove-${memberId}`]: false }));
    }
  };

  const handleTransferMember = async (zoneId, memberId) => {
    const targetZoneId = Number(transferTargets[memberId] || 0);
    if (!targetZoneId || targetZoneId === zoneId) {
      toast.error('Select a different zone to transfer this member');
      return;
    }

    try {
      setMemberActionLoading((prev) => ({ ...prev, [`transfer-${memberId}`]: true }));
      await zonesAPI.assignMember(targetZoneId, memberId);
      toast.success('Member transferred successfully');
      setTransferTargets((prev) => ({ ...prev, [memberId]: '' }));
      await refreshZoneData(zoneId, targetZoneId);
    } catch (error) {
      console.error('Error transferring member:', error);
      toast.error(error.message || 'Failed to transfer member');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [`transfer-${memberId}`]: false }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Zone name is required');
      return;
    }

    try {
      if (editingId) {
        const result = await zonesAPI.update(editingId, formData);
        if (result.status === 'success' || result.success) {
          toast.success('Zone updated successfully');
        }
      } else {
        const result = await zonesAPI.create(formData);
        if (result.status === 'success' || result.success) {
          toast.success('Zone created successfully');
        }
      }
      resetForm();
      loadZones();
    } catch (error) {
      console.error('Error saving zone:', error);
      toast.error(error.message || 'Failed to save zone');
    }
  };

  const handleEdit = (zone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      location: zone.location || '',
      pastor_id: zone.pastor_id || null
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      const result = await zonesAPI.delete(id);
      if (result.status === 'success' || result.success) {
        toast.success('Zone deleted successfully');
        loadZones();
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', location: '', pastor_id: null });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Manage Zones</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Zone' : 'Add New Zone'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter zone name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter zone description"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter zone location"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zones List */}
      <div className="p-6">
        {zones.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No zones yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first zone to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Zone Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => toggleExpandZone(zone.id)}>
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                        {zone.location && <p className="text-sm text-gray-500">{zone.location}</p>}
                        {zone.description && <p className="text-sm text-gray-600 mt-1">{zone.description}</p>}
                      </div>
                      {expandedZoneId === zone.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(zone)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Members Section */}
                {expandedZoneId === zone.id && (
                  <div className="p-4 bg-white">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Assigned Members
                    </h4>

                    {loadingMembers[zone.id] ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : !zoneMembers[zone.id] || zoneMembers[zone.id].length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">No members assigned to this zone yet</p>
                    ) : (
                      <div className="space-y-2">
                        {zoneMembers[zone.id].map((member) => (
                          <div
                            key={member.id}
                            className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-sm text-gray-600 truncate">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap md:justify-end">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {member.role || 'member'}
                              </span>
                              <select
                                value={transferTargets[member.id] || ''}
                                onChange={(e) => setTransferTargets((prev) => ({ ...prev, [member.id]: e.target.value }))}
                                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                              >
                                <option value="">Transfer to...</option>
                                {zones
                                  .filter((item) => item.id !== zone.id && item.is_active !== 0)
                                  .map((targetZone) => (
                                    <option key={targetZone.id} value={targetZone.id}>
                                      {targetZone.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleTransferMember(zone.id, member.id)}
                                disabled={memberActionLoading[`transfer-${member.id}`]}
                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                              >
                                {memberActionLoading[`transfer-${member.id}`] ? 'Moving...' : 'Transfer'}
                              </button>
                              <button
                                onClick={() => handleRemoveMember(zone.id, member.id)}
                                disabled={memberActionLoading[`remove-${member.id}`]}
                                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              >
                                {memberActionLoading[`remove-${member.id}`] ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
