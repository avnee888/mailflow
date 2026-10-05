import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const emailApi = createApi({
  reducerPath: 'emailApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/' }),
  tagTypes: ['Email'],
  endpoints: (builder) => ({
    getEmails: builder.query<any[], { search: string; page: number }>({
      query: ({ search, page }) => search ? `search?q=${search}` : `emails?page=${page}`,
      providesTags: ['Email'],
    }),
    scheduleEmails: builder.mutation<any, any>({
      query: (body) => ({
        url: 'schedule',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Email'],
    }),
  }),
});

export const { useGetEmailsQuery, useScheduleEmailsMutation } = emailApi;
