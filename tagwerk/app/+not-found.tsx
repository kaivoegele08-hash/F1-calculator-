import { Redirect } from 'expo-router';
import React from 'react';

/** Unknown URLs (for example when the web build is opened from a file) fall back to the home screen. */
export default function NotFound() {
  return <Redirect href="/" />;
}
