from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/seats')
def seats():
    return render_template('seat.html')


def get_db():
  return mysql.connector.connect(
      host="gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
      port=4000,
      user="333GSioHP1qxJgS.root",
      password="gYtU2Ug85w75A4Ul",
      database="movie_db",
      ssl_verify_cert=True,
      ssl_verify_identity=True,
  )


# 1. Bill Calculation & Booking Route (Processing Logic)
@app.route("/book", methods=["POST"])
def book_ticket():
  data = request.json
  user_id = data["user_id"]
  theatre_id = data["theatre_id"]
  seat_id = data["seat_id"]
  base_price = float(data["base_price"])
  num_seats = int(data["num_seats"])
  discount = float(data.get("discount", 0))

  # Formula: Total Amount = (Base Price * Seats) + GST (18%) - Discount
  subtotal = base_price * num_seats
  gst = subtotal * 0.18
  total_amount = subtotal + gst - discount

  db = get_db()
  cursor = db.cursor()

  # Insert into Booking table
  booking_query = "INSERT INTO Booking (User_ID, Theatre_ID, Seat_ID, Booking_Status) VALUES (%s, %s, %s, %s)"
  cursor.execute(booking_query, (user_id, theatre_id, seat_id, "Confirmed"))
  booking_id = cursor.lastrowid

  # Insert into Payment table
  payment_query = "INSERT INTO Payment (Booking_ID, Payment_method, Payment_Date, Amount) VALUES (%s, %s, CURDATE(), %s)"
  cursor.execute(
      payment_query,
      (booking_id, data.get("payment_method", "Online"), total_amount),
  )

  db.commit()
  cursor.close()
  db.close()

  return jsonify({
      "message": "Booking successful!",
      "booking_id": booking_id,
      "total_amount": round(total_amount, 2),
  })


# 2. View All, First, Last, or Search Movies Route
@app.route("/movies", methods=["GET"])
def get_movies():
  search_query = request.args.get("search", "")
  view_type = request.args.get("type", "all")  # 'all', 'first', 'last'

  db = get_db()
  cursor = db.cursor(dictionary=True)

  if view_type == "first":
    cursor.execute("SELECT * FROM Movies ORDER BY Movie_ID ASC LIMIT 1")
  elif view_type == "last":
    cursor.execute("SELECT * FROM Movies ORDER BY Movie_ID DESC LIMIT 1")
  elif search_query:
    cursor.execute(
        "SELECT * FROM Movies WHERE Name LIKE %s", (f"%{search_query}%",)
    )
  else:
    cursor.execute("SELECT * FROM Movies")

  results = cursor.fetchall()
  cursor.close()
  db.close()
  return jsonify(results)

@app.route("/screenings", methods=["GET"])
def get_screenings():
  db = get_db()
  cursor = db.cursor(dictionary=True)
  cursor.execute("SELECT * FROM Screenings")  # Assuming your table is named Screenings
  results = cursor.fetchall()
  cursor.close()
  db.close()
  return jsonify(results)


if __name__ == "__main__":
  app.run(debug=True, port=5000)
