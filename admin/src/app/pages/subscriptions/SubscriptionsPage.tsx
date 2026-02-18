import { useNavigate } from 'react-router';
import SubscriptionList from '@app/components/subscriptions/SubscriptionList';
import type { Subscription } from '@shared/hooks/useSubscriptions';

export default function SubscriptionsPage() {
  const navigate = useNavigate();

  const handleSelect = (sub: Subscription) => {
    navigate(`/subscriptions/${sub.id}`);
  };

  return <SubscriptionList onSelect={handleSelect} />;
}
