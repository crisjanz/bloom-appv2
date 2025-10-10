#!/bin/bash

# Fix imports script for DDD migration
echo "🔧 Fixing import paths..."

# Navigate to the project directory
cd /Users/cristianjanz/bloom-app/admin/src

# Common import fixes for components
find . -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from '../../common/ComponentCard'|from '@shared/ui/common/ComponentCard'|g" \
  -e "s|from '../../form/input/InputField'|from '@shared/ui/forms/input/InputField'|g" \
  -e "s|from '../../form/Label'|from '@shared/ui/forms/Label'|g" \
  -e "s|from '../../form/Select'|from '@shared/ui/forms/Select'|g" \
  -e "s|from '../../form/input/TextArea'|from '@shared/ui/forms/input/TextArea'|g" \
  -e "s|from '../../form/AddressAutocomplete'|from '@shared/ui/forms/AddressAutocomplete'|g" \
  -e "s|from '../../form/group-input/PhoneInput'|from '@shared/ui/forms/group-input/PhoneInput'|g" \
  -e "s|from '../../ui/table'|from '@shared/ui/components/ui/table'|g" \
  -e "s|from '../../ui/badge/Badge'|from '@shared/ui/components/ui/badge/Badge'|g" \
  -e "s|from '../../ui/button/Button'|from '@shared/ui/components/ui/button/Button'|g" \
  -e "s|from '../../ui/modal'|from '@shared/ui/components/ui/modal'|g" \
  -e "s|from '../../utils/googlePlaces'|from '@shared/utils/googlePlaces'|g" \
  -e "s|from '../icons'|from '@shared/assets/icons'|g" \
  -e "s|from '../context/SidebarContext'|from '@app/contexts/SidebarContext'|g" \
  -e "s|from '../context/ThemeContext'|from '@app/contexts/ThemeContext'|g" \
  -e "s|from '../components/common/ThemeToggleButton'|from '@shared/ui/common/ThemeToggleButton'|g" \
  -e "s|from '../components/header/NotificationDropdown'|from '@shared/ui/header/NotificationDropdown'|g" \
  -e "s|from '../components/header/UserDropdown'|from '@shared/ui/header/UserDropdown'|g" \
  {} \;

# Fix absolute imports that are one level off
find . -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from '../common/ComponentCard'|from '@shared/ui/common/ComponentCard'|g" \
  -e "s|from '../form/input/InputField'|from '@shared/ui/forms/input/InputField'|g" \
  -e "s|from '../form/Label'|from '@shared/ui/forms/Label'|g" \
  -e "s|from '../form/Select'|from '@shared/ui/forms/Select'|g" \
  {} \;

# Fix layout imports
find . -name "*.tsx" -type f -exec sed -i '' \
  -e "s|from './layout/AppLayout'|from '@shared/ui/layout/AppLayout'|g" \
  -e "s|from '../layout/AppLayout'|from '@shared/ui/layout/AppLayout'|g" \
  {} \;

echo "✅ Import paths updated!"