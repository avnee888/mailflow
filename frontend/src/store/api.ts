import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const emailApi = createApi({
  reducerPath: 'emailApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:4000/api/' }),
  tagTypes: ['Email'],
  endpoints: (builder) => ({
    getEmails: builder.query<any[], string | void>({
      query: (search) => search ? `search?q=${search}` : 'emails',
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
