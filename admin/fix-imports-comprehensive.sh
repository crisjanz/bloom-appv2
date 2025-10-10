#!/bin/bash

# Comprehensive import fixes for DDD migration
echo "🔧 Running comprehensive import fixes..."

cd /Users/cristianjanz/bloom-app/admin/src

# Fix all relative imports to use path aliases
find . -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from '../../icons'|from '@shared/assets/icons'|g" \
  -e "s|from '../icons'|from '@shared/assets/icons'|g" \
  -e "s|from '../form/Label'|from '@shared/ui/forms/Label'|g" \
  -e "s|from '../form/input/InputField'|from '@shared/ui/forms/input/InputField'|g" \
  -e "s|from '../form/input/Checkbox'|from '@shared/ui/forms/input/Checkbox'|g" \
  -e "s|from '../form/input/TextArea'|from '@shared/ui/forms/input/TextArea'|g" \
  -e "s|from '../ui/button/Button'|from '@shared/ui/components/ui/button/Button'|g" \
  -e "s|from '../ui/badge/Badge'|from '@shared/ui/components/ui/badge/Badge'|g" \
  -e "s|from '../ui/table'|from '@shared/ui/components/ui/table'|g" \
  -e "s|from '../ui/modal'|from '@shared/ui/components/ui/modal'|g" \
  -e "s|from '../common/ComponentCard'|from '@shared/ui/common/ComponentCard'|g" \
  -e "s|from '../utils/googlePlaces'|from '@shared/utils/googlePlaces'|g" \
  {} \;

# Fix deeper relative imports (three levels up)
find . -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from '../../../common/ComponentCard'|from '@shared/ui/common/ComponentCard'|g" \
  -e "s|from '../../../form/input/InputField'|from '@shared/ui/forms/input/InputField'|g" \
  -e "s|from '../../../form/Label'|from '@shared/ui/forms/Label'|g" \
  -e "s|from '../../../form/Select'|from '@shared/ui/forms/Select'|g" \
  -e "s|from '../../../form/input/TextArea'|from '@shared/ui/forms/input/TextArea'|g" \
  -e "s|from '../../../form/AddressAutocomplete'|from '@shared/ui/forms/AddressAutocomplete'|g" \
  -e "s|from '../../../form/group-input/PhoneInput'|from '@shared/ui/forms/group-input/PhoneInput'|g" \
  -e "s|from '../../../ui/table'|from '@shared/ui/components/ui/table'|g" \
  -e "s|from '../../../ui/badge/Badge'|from '@shared/ui/components/ui/badge/Badge'|g" \
  -e "s|from '../../../utils/googlePlaces'|from '@shared/utils/googlePlaces'|g" \
  {} \;

# Fix app-level relative imports
find ./app -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from './components/form/GoogleMapsProvider'|from '@shared/ui/forms/GoogleMapsProvider'|g" \
  -e "s|from './layout/AppLayout'|from '@shared/ui/layout/AppLayout'|g" \
  -e "s|from './components/common/ScrollToTop'|from '@shared/ui/common/ScrollToTop'|g" \
  {} \;

# Fix layout component imports
find ./shared/ui/layout -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from '../context/SidebarContext'|from '@app/contexts/SidebarContext'|g" \
  -e "s|from '../components/common/ThemeToggleButton'|from '@shared/ui/common/ThemeToggleButton'|g" \
  -e "s|from '../components/header/NotificationDropdown'|from '@shared/ui/header/NotificationDropdown'|g" \
  -e "s|from '../components/header/UserDropdown'|from '@shared/ui/header/UserDropdown'|g" \
  {} \;

echo "✅ Comprehensive import fixes completed!"