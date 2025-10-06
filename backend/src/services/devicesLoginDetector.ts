import axios from "axios";
import { UAParser } from "ua-parser-js";
import supabase from "../lib/supabase";
import { resend } from "./sendOtp";
import { Request } from "express";

interface LocationData {
    city?: string;
    regionName?: string;
    country?: string;
    timezone?: string;
}

export interface DeviceInfo {
    ip_address: string;
    os: string;
    browser: string;
    device_name: string;
    city: string | null;
    region: string | null;
    country: string | null;
    timezone: string | null;
    last_accessed_at: string;
}

const getDevicesLocation_info = async (req: Request): Promise<DeviceInfo> => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const parser = new UAParser(userAgent);
        const result = parser.getResult();
        
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                  req.headers['x-real-ip'] as string ||
                  req.socket.remoteAddress ||
                  'unknown';
        
        // Get location data from IP
        let locationData: LocationData = {};
        try {
            const isLocalIp = (ip: string) => {
                return ip === 'unknown' || ip === '::1' || ip === '127.0.0.1';
            };
            if (!isLocalIp(ip)) {
                const response = await axios.get<LocationData>(`http://ip-api.com/json/${ip}`);
                locationData = response.data;
            }
        } catch (locationError) {
            console.error('Location API error:', locationError);
        }
        
        return {
            ip_address: ip,
            os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
            browser: req.body.deviceData?.browser || `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
            device_name: req.body.deviceData?.device_name || result.device.model || result.device.type || 'Unknown',
            city: locationData.city || null,
            region: locationData.regionName || null,
            country: locationData.country || null,
            timezone: locationData.timezone || null,
            last_accessed_at: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error getting device info:', error);
        throw error;
    }
};

//  Detect if user's device is new or not
const isDeviceNew = async (userId: number, device: DeviceInfo): Promise<boolean> => {
    try {
        const { data: devices } = await supabase
            .from('known_devices')
            .select('*')
            .eq('user_id', userId);

    
        return !devices?.some(d => 
            d.ip_address === device.ip_address &&
            d.os === device.os &&
            d.browser === device.browser
        );
    } catch (error) {
        console.error('Error checking if device is new:', error);
        return true;
    }
};

//Send new device email with correct property names
const sendNewDeviceEmail = async (toEmail: string, username: string, device: DeviceInfo) => {
    try {
        const html = `
        <p>Hello <strong>${username}</strong>,</p>
        <p>A login from a <strong>new device</strong> was detected:</p>
        <ul>
          <li><strong>Device:</strong> ${device.device_name}</li>
          <li><strong>OS:</strong> ${device.os}</li>
          <li><strong>Browser:</strong> ${device.browser}</li>
          <li><strong>IP Address:</strong> ${device.ip_address}</li>
          <li><strong>Location:</strong> ${device.city || 'Unknown'}, ${device.region || 'Unknown'}, ${device.country || 'Unknown'}</li>
          <li><strong>Time:</strong> ${new Date(device.last_accessed_at).toLocaleString()}</li>
          <li><strong>Timezone:</strong> ${device.timezone || 'Unknown'}</li>
        </ul>
        <p>If this wasn't you, please reset your password immediately.</p>
      `;
        
        await resend.emails.send({
            from: `"NueroVision" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'New Device Detected',
            html
        });
    } catch (error) {
        console.error('Error sending new device email:', error);
        throw error;
    }
};

//Save device with correct property names and column mapping
const saveDevice = async (userId: number, device: DeviceInfo) => {
    try {
        const { data: deviceData, error: deviceError } = await supabase
            .from('known_devices')
            .insert({
                user_id: userId,
                ip_address: device.ip_address,
                os: device.os,
                browser: device.browser,
                device_name: device.device_name,
                city: device.city,
                region: device.region,
                country: device.country,
                timezone: device.timezone,
                last_accessed_at: device.last_accessed_at 
            });
            
        if (deviceError) {
            console.error('Error saving device:', deviceError);
            throw deviceError;
        }
        
        return deviceData;
    } catch (error) {
        console.error('Error in saveDevice:', error);
        throw error;
    }
};

export {
    getDevicesLocation_info,
    saveDevice, 
    sendNewDeviceEmail, 
    isDeviceNew 
};