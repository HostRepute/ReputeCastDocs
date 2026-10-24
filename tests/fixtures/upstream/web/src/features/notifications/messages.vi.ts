import { translate } from '@/i18n'
import { m } from './messages'

export default translate(m, {
  title: 'Thông báo',
  account: 'Tài khoản và bảo mật',
  filterLabel: 'Bộ lọc',
  filter:
    '{filter, select, unread {Chưa đọc} approvals {Phê duyệt} sending {Gửi thư} providers {Nhà cung cấp} team {Nhóm} hostrepute {HostRepute} other {Tất cả}}',
  unreadCount: 'Chưa đọc · {count}',
})
