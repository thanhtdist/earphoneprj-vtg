import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const GuideStartPage = () => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="text-center mb-4">
            <button className="btn btn-outline-danger rounded-pill px-4">
              ガイド専用ページ
            </button>
          </div>

          <div className="mb-3">
            <h5 className="fw-bold">ツアー名</h5>
            <div className="border-bottom pb-2">浅草寺ツアー</div>
          </div>

          <div className="mb-3">
            <h5 className="fw-bold">出発日</h5>
            <div className="border-bottom pb-2">2025/01/01</div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold">帰着日</h5>
            <div className="border-bottom pb-2">2025/01/03</div>
          </div>
          <div className="my-4">
            <p className="mb-1">1. 上記の内容で間違いありませんか？</p>
            <p>2. ガイド画面に入ったらお客様にQRコードを読ませてください。</p>
          </div>

          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="agreeCheck"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
            />
            <label className="form-check-label" htmlFor="agreeCheck">
              上記を理解しました。
            </label>
          </div>

          <div className="text-center">
            <button
              className="btn btn-danger w-100"
              disabled={!agreed}
            >
              ガイドを開始する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideStartPage;
