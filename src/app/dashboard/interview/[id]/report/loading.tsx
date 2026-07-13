import { Loader } from "@/components/Loader";

/** The report is the slowest page in the app — it waits on the model. */
export default function ReportLoading() {
  return <Loader fullscreen={false} label="Writing up the panel's notes" />;
}
