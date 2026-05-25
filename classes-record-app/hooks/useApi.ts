import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const fetchPublicSchedules = async () => {
  try {
    const response = await fetch(`${API_URL}/api/schedules/public`);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    // Return mock data for development
    return [
      {
        id: "1",
        name: "Spring 2026 Schedule",
        userId: "Admin",
        startDate: "2026-01-15",
        endDate: "2026-05-30"
      },
      {
        id: "2",
        name: "Faculty Training Program",
        userId: "Dean Office",
        startDate: "2026-02-01",
        endDate: "2026-02-28"
      }
    ];
  }
};

export const fetchScheduleDetails = async (scheduleId: string) => {
  try {
    const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return {
      id: scheduleId,
      name: "Sample Schedule",
      courses: [],
      students: []
    };
  }
};
