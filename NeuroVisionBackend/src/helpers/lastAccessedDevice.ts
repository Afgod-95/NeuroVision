
import supabase from "../lib/supabase";


// Define DeviceInfo type if not imported from elsewhere
type DeviceInfo = {
  last_accessed_at: string | Date;
  ip_address: string;
  os: string;
  browser: string;
};

// Helper function to update last accessed time for existing devices
const updateDeviceLastAccessed = async (userId: number, device: DeviceInfo) => {
  try {
    const { error } = await supabase
      .from('known_devices')
      .update({ last_accessed_at: device.last_accessed_at })
      .eq('user_id', userId)
      .eq('ip_address', device.ip_address)
      .eq('os', device.os)
      .eq('browser', device.browser);
      
    if (error) {
      console.error('Error updating device last accessed:', error);
    }
  } catch (error) {
    console.error('Error in updateDeviceLastAccessed:', error);
  }
};

export { updateDeviceLastAccessed }