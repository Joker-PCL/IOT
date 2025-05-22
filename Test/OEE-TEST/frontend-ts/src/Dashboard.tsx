import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Grid,
  Card,
  CardContent,
} from "@mui/material";

import { fDateTime, today } from "./utils/format-time";

interface MachineData {
  machineId: string;
  status: string;
  rpm: number;
  okCount: number;
  ngCount: number;
  timestamp: string;
}

const socket = io("http://localhost:3000");

export default function Dashboard() {
  const [recentData, setRecentData] = useState<MachineData[]>([]);
  const [liveData, setLiveData] = useState<MachineData | null>(null);

  useEffect(() => {
    // axios
    //   .get<MachineData[]>("http://localhost:3000/api/machine/M01/recent")
    //   .then((res) => setRecentData(res.data));

    socket.on("machine-data", (msg: MachineData) => {
      console.log("Received data:", msg);
      setLiveData(msg);
      setRecentData((prev) => [
        { ...msg, timestamp: today() },
        ...prev.slice(0, 9),
      ]); // เพิ่ม liveData ขึ้นต้น และตัดให้เหลือ 10 แถว
    });

    return () => {
      socket.off("machine-data");
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        🏭 Machine M01 Dashboard
      </Typography>

      {liveData && (
        <Card
          sx={{
            mb: 4,
            backgroundColor: liveData.status === "ON" ? "#e0f7fa" : "#ffebee",
          }}
        >
          <CardContent>
            <Typography variant="h6">Live Status</Typography>
            <Typography>Status: {liveData.status}</Typography>
            <Typography>RPM: {liveData.rpm}</Typography>
            <Typography>OK: {liveData.okCount}</Typography>
            <Typography>NG: {liveData.ngCount}</Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <ReactApexChart
            type="radialBar"
            height={350}
            series={[liveData?.rpm ?? 0]}
            options={{
              labels: ["RPM"],
              chart: {
                height: 350,
                type: "radialBar",
                toolbar: {
                  show: true,
                },
              },
              plotOptions: {
                radialBar: {
                  startAngle: -135,
                  endAngle: 225,
                  hollow: {
                    margin: 0,
                    size: "50%",
                    background: "#fff",
                    image: undefined,
                    imageOffsetX: 0,
                    imageOffsetY: 0,
                    position: "front",
                    dropShadow: {
                      enabled: true,
                      top: 3,
                      left: 0,
                      blur: 4,
                      opacity: 0.5,
                    },
                  },
                  track: {
                    background: "#fff",
                    strokeWidth: "67%",
                    margin: 0, // margin is in pixels
                    dropShadow: {
                      enabled: true,
                      top: -3,
                      left: 0,
                      blur: 4,
                      opacity: 0.7,
                    },
                  },
                  dataLabels: {
                    show: true,
                    name: {
                      offsetY: -10,
                      show: true,
                      color: "green",
                      fontSize: "17px",
                    },
                    value: {
                      color: "#888",
                      fontSize: "36px",
                      fontWeight: "bold",
                      show: true,
                    },
                  },
                },
              },
              fill: {
                type: "gradient",
                gradient: {
                  shade: "dark",
                  type: "horizontal",
                  shadeIntensity: 0.5,
                  gradientToColors: ["#ABE5A1"],
                  inverseColors: true,
                  opacityFrom: 1,
                  opacityTo: 1,
                  stops: [0, 100],
                },
              },
              stroke: {
                lineCap: "round",
              },
            }}
          />
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ my: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          📈 OK/NG Trend
        </Typography>
        <ReactApexChart
          type="area"
          height={300}
          series={[
            {
              name: "OK",
              data: recentData.reverse().map((d) => d.okCount),
            },
            {
              name: "NG",
              data: recentData.reverse().map((d) => d.ngCount),
            },
          ]}
          options={{
            chart: {
              id: "realtime",
              animations: { enabled: true },
            },
            stroke: {
              curve: "smooth",
            },
            dataLabels: {
              enabled: false,
            },
            xaxis: {
              categories: recentData
                .reverse()
                .map((d) => fDateTime(d.timestamp, "HH:mm:ss")),
              title: { text: "Time" },
            },
            yaxis: { title: { text: "Count" } },
            colors: ["#4caf50", "#f44336"],
          }}
        />
      </Paper>

      <Paper elevation={3}>
        <Box p={2}>
          <Typography variant="h6">Recent Data</Typography>
          <List>
            {recentData.map((d, index) => (
              <div key={index}>
                <ListItem>
                  <Grid container>
                    <Grid item xs={4}>
                      <ListItemText primary={fDateTime(d.timestamp)} />
                    </Grid>
                    <Grid item xs={8}>
                      <ListItemText
                        primary={`Status: ${d.status}, OK: ${d.okCount}, NG: ${d.ngCount}`}
                      />
                    </Grid>
                  </Grid>
                </ListItem>
                <Divider />
              </div>
            ))}
          </List>
        </Box>
      </Paper>
    </Container>
  );
}
