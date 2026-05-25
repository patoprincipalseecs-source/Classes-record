// Web fallback for nodemailer
export const createTransport = () => ({
  sendMail: async () => console.log('Email sending not available on web')
});
export default { createTransport };
