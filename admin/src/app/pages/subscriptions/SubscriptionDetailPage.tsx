import { useParams } from 'react-router';
import SubscriptionDetail from '@app/components/subscriptions/SubscriptionDetail';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return <SubscriptionDetail subscriptionId={id} />;
}
