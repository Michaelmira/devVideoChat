export type MeetingProps = {
  meetingId: string;
  token: string;
  name: string;
  isHost: boolean;
  canRecord: boolean;
  endsAt: string;
  hostName: string;
};
