export default function CompanyPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text">회사 정보</h1>

      <div className="border border-border rounded-xl bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-cream flex items-center justify-center text-2xl">
            &#127970;
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">드림포이엔</h2>
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="text-sm text-text-light w-20 shrink-0">
              대표자
            </span>
            <span className="text-sm text-text font-medium">하준명</span>
          </div>
          <div className="flex gap-3">
            <span className="text-sm text-text-light w-20 shrink-0">주소</span>
            <span className="text-sm text-text font-medium">
              경기 안양시 만안구 덕천로152번길 25 (안양동)
              <br />
              비동 2005호
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
