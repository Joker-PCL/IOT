import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { SvgColor } from 'src/components/svg-color';

import Swal from 'sweetalert2';
import { DashboardContent } from 'src/layouts/dashboard';
import { parseTimestamp, fDateTime } from 'src/utils/format-time';

import { PostItem } from '../post-item';
import { PostFilter } from '../post-filter';
import { PostSearch } from '../post-search';

import type { DashboardProps } from '../post-item';
import { applyFilter } from '../utils';

import { Loading } from '../../../components/loading/loading';
import { MachineDataProps } from '../../performance/view/performance-view';

import { DashboardApi } from '../../../api/production';
import { API_URL } from '../../../api/config/link_api';

// ----------------------------------------------------------------------
const socket = io(API_URL.BASE_URL, { transports: ['websocket'] });

export function DashboardView() {
  const navigate = useNavigate();
  const [filterName, setFilterName] = useState('');
  const [groupName, setGroupName] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardProps[]>([]);
  const subscribedMachines = useRef(new Set<string>()); // Move useRef outside of useEffect

  useEffect(() => {
    // Subscribe to specific machine_name_en topics
    data.forEach((item) => {
      if (!subscribedMachines.current.has(item.machine_sn) && item.machine_sn) {
        socket.emit('subscribe', item.machine_sn); // Request subscription for new machine_id
        subscribedMachines.current.add(item.machine_sn); // Add machine_id to the Set
        console.log(`Subscribed to machine_sn: ${item.machine_sn}`);
      }
    });

    // Listen for subscription confirmation
    socket.on('subscribed', (msg) => {
      console.log('Subscribed to topic:', msg.topic);
    });

    // Listen for machine-data updates
    socket.on('machine-data', (msg: MachineDataProps) => {
      // console.log('Received machine_name_en data:', msg); // Log received data
      setData((prevData) =>
        prevData.map((item) =>
          item.machine_sn === msg.machine_sn
            ? { ...item, liveData: msg } // Update liveData for the matching machine_id
            : item
        )
      );
    });

    return () => {
      socket.off('subscribed'); // Remove subscribed event listener
      socket.off('machine-data'); // Remove machine-data event listener
    };
  }, [data]);

  const setMachinesOffline = () => {
    const now = new Date().getTime(); // เวลาปัจจุบันใน milliseconds

    setData((prevData) =>
      prevData.map((item) => {
        const lastTimestamp = item.liveData?.timestamp
          ? parseTimestamp(item.liveData.timestamp) // ใช้ฟังก์ชัน parseTimestamp เพื่อแปลง timestamp
          : 0; // ถ้าไม่มี timestamp ให้ใช้ค่า 0
        const isOffline = now - lastTimestamp > 10000; // เช็คว่าห่างจากเวลาปัจจุบันเกิน 10 วินาทีหรือไม่
        if (!isOffline) {
          return item;
        }
        console.log('Checking machine_name_en status...');

        return {
          ...item,
          liveData: {
            ...item.liveData,
            machine_sn: item.liveData?.machine_sn || '', // กำหนดค่าเริ่มต้นให้ machine_id เป็น string ว่าง
            status: isOffline ? 'OFFLINE' : item.liveData?.status || '',
            cycle_time: isOffline ? 0 : item.liveData?.cycle_time || 0,
            cpm: isOffline ? 0 : item.liveData?.cpm || 0,
            good_path_count: isOffline ? 0 : item.liveData?.good_path_count || 0,
            reject_count: isOffline ? 0 : item.liveData?.reject_count || 0,
            start_time: isOffline ? 0 : item.liveData?.start_time || 0,
            stop_time: isOffline ? 0 : item.liveData?.stop_time || 0,
            timestamp: item.liveData?.timestamp ?? '',
          },
        };
      })
    );
  };

  useEffect(() => {
    const timeout = setTimeout(setMachinesOffline, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(setMachinesOffline, 5000);
    return () => clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const getData: DashboardProps[] = await DashboardApi(); // Wait for the promise to resolve
        setIsLoading(false);
        setData(getData);
        console.log("getData", getData);
        setGroupName([...new Set([...getData.map((item) => item.group_name)])]); // Extract group names from the data
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          navigate('/login');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด...',
            text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้!',
            showConfirmButton: false,
          });
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData(); // Call the async function to fetch the data
  }, [isLoading, navigate]);

  const dataFiltered: DashboardProps[] = applyFilter({
    inputData: data,
    filterName,
  });

  const handleFilterGroup = useCallback((newSort: string) => {
    setFilterName(newSort);
  }, []);

  return (
    <>
      <DashboardContent>
      <Loading isShowing={isLoading} />
        <Box display="flex" alignItems="center" mb={5} sx={{ p: 3, pt: 1 }}>
          <Typography variant="h4" flexGrow={1}>
            Dashboard
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => {
              navigate('/machine-setting/form');
            }}
            startIcon={<SvgColor src="/assets/icons/iconify/add.svg" width="20px" height="20px" />}
          >
            เพิ่มรายการเครื่องจักร
          </Button>
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
          <PostSearch
            posts={data}
            onSearch={(event: React.SyntheticEvent, value: string) => {
              setFilterName(value);
            }}
          />
          <PostFilter
            filterBy={filterName}
            onFilter={handleFilterGroup}
            options={[
              { value: '', label: 'Groups...' },
              ...groupName.map((group) => ({
                value: group,
                label: group,
              })),
            ]}
          />
        </Box>

        <Grid container spacing={3}>
          {!isLoading
            ? (filterName ? dataFiltered : data).map((post, index) => (
                <Grid key={post.machine_name_en + index} xs={12} sm={6} md={4} xl={3}>
                  <PostItem post={post} liveData={post.liveData} />
                </Grid>
              ))
            : ''}
        </Grid>
      </DashboardContent>
    </>
  );
}
